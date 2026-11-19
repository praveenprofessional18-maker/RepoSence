import { useCallback, useEffect, useMemo, useState } from "react";
import dagre from "dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "reactflow";
import "reactflow/dist/style.css";
import "./graph.css";
import FileNode from "./FileNode";
import FolderNode from "./FolderNode";

const nodeTypes = { fileNode: FileNode, folderNode: FolderNode };
const nodeSize = { width: 220, height: 94 };

function layoutNodes(nodes, edges, direction) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: 54,
    ranksep: 92,
    marginx: 36,
    marginy: 36
  });
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) graph.setNode(node.id, nodeSize);
  for (const edge of edges) {
    if (ids.has(edge.source) && ids.has(edge.target)) graph.setEdge(edge.source, edge.target);
  }
  dagre.layout(graph);
  return nodes.map((node) => {
    const position = graph.node(node.id);
    return {
      ...node,
      position: {
        x: position ? position.x - nodeSize.width / 2 : 0,
        y: position ? position.y - nodeSize.height / 2 : 0
      }
    };
  });
}

function getDependencyEdges(edges, selectedId) {
  const incoming = new Map();
  const outgoing = new Map();
  for (const edge of edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    incoming.get(edge.target).push(edge);
    outgoing.get(edge.source).push(edge);
  }

  const upstream = new Set();
  const downstream = new Set();
  const upstreamPaths = new Set([selectedId]);
  const downstreamPaths = new Set([selectedId]);
  const walk = (relation, paths, adjacency, getNext) => {
    const seen = new Set(paths);
    const queue = [selectedId];
    while (queue.length) {
      const current = queue.pop();
      for (const edge of adjacency.get(current) || []) {
        relation.add(edge.id);
        const next = getNext(edge);
        if (!seen.has(next)) {
          seen.add(next);
          paths.add(next);
          queue.push(next);
        }
      }
    }
  };
  walk(downstream, downstreamPaths, outgoing, (edge) => edge.target);
  walk(upstream, upstreamPaths, incoming, (edge) => edge.source);
  return { upstream, downstream, paths: new Set([...upstreamPaths, ...downstreamPaths]) };
}

function GraphFlow({
  graphNodes,
  graphEdges,
  direction,
  search,
  focusPath,
  selectedNodeId,
  dependencyOnly,
  onlyRenderVisibleElements,
  onNodeSelect,
  onControlsReady
}) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const { fitView, setCenter, zoomIn, zoomOut } = useReactFlow();
  const positionedNodes = useMemo(() => layoutNodes(graphNodes, graphEdges, direction), [graphNodes, graphEdges, direction]);
  const dependencies = useMemo(() => selectedNodeId ? getDependencyEdges(graphEdges, selectedNodeId) : null, [graphEdges, selectedNodeId]);

  useEffect(() => setFlowNodes(positionedNodes), [positionedNodes, setFlowNodes]);
  useEffect(() => setFlowEdges(graphEdges), [graphEdges, setFlowEdges]);

  const focusNode = useCallback((path) => {
    const node = flowNodes.find((item) => item.id === path);
    if (node) setCenter(node.position.x + nodeSize.width / 2, node.position.y + nodeSize.height / 2, { zoom: 1.25, duration: 450 });
  }, [flowNodes, setCenter]);

  useEffect(() => {
    if (focusPath) focusNode(focusPath);
  }, [focusPath, focusNode]);

  useEffect(() => {
    if (!search.trim()) return;
    const query = search.trim().toLowerCase();
    const match = positionedNodes.find((node) =>
      `${node.data.label} ${node.data.path || ""}`.toLowerCase().includes(query)
    );
    if (match) setCenter(match.position.x + nodeSize.width / 2, match.position.y + nodeSize.height / 2, { zoom: 1.2, duration: 400 });
  }, [search, positionedNodes, setCenter]);

  useEffect(() => {
    onControlsReady?.({
      fitView: () => fitView({ padding: 0.18, duration: 350 }),
      zoomIn,
      zoomOut,
      focusNode
    });
  }, [fitView, focusNode, onControlsReady, zoomIn, zoomOut]);

  const renderedNodes = useMemo(() => flowNodes.map((node) => {
    const connectedToHover = !hoveredNodeId || graphEdges.some((edge) =>
      (edge.source === hoveredNodeId && edge.target === node.id) ||
      (edge.target === hoveredNodeId && edge.source === node.id)
    ) || node.id === hoveredNodeId;
    const inDependencySet = !dependencyOnly || !dependencies || dependencies.paths.has(node.id);
    return {
      ...node,
      data: {
        ...node.data,
        direction,
        selected: node.id === selectedNodeId,
        dimmed: Boolean(node.data.dimmed || !connectedToHover || !inDependencySet)
      }
    };
  }), [flowNodes, graphEdges, hoveredNodeId, dependencyOnly, dependencies, direction, selectedNodeId]);

  const renderedEdges = useMemo(() => flowEdges.map((edge) => {
    const cycle = Boolean(edge.data?.cycle);
    const hoverConnected = !hoveredNodeId || edge.source === hoveredNodeId || edge.target === hoveredNodeId;
    const isUpstream = dependencies?.upstream.has(edge.id);
    const isDownstream = dependencies?.downstream.has(edge.id);
    const dependencyActive = !dependencyOnly || !dependencies || isUpstream || isDownstream;
    const stroke = cycle
      ? "#ef4444"
      : isDownstream
        ? "#22c55e"
        : isUpstream
          ? "#3b82f6"
          : "#8b5cf6";
    return {
      ...edge,
      type: "smoothstep",
      style: {
        stroke,
        strokeWidth: isUpstream || isDownstream || cycle ? 2 : 1.4,
        strokeDasharray: cycle ? "6 4" : undefined,
        opacity: (hoverConnected && dependencyActive) ? 0.9 : 0.1
      },
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 }
    };
  }), [flowEdges, hoveredNodeId, dependencies, dependencyOnly]);

  return <div className="graph-surface relative h-[520px] min-w-0 overflow-hidden rounded-xl border border-line bg-[var(--bg)]" aria-label="Interactive repository dependency graph">
    <ReactFlow
      nodes={renderedNodes}
      edges={renderedEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onNodeSelect(node)}
      onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
      onNodeMouseLeave={() => setHoveredNodeId(null)}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      nodesConnectable={false}
      onlyRenderVisibleElements={onlyRenderVisibleElements}
      proOptions={{ hideAttribution: true }}
      minZoom={0.12}
      maxZoom={2}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--border)"/>
      <Controls showInteractive={false} position="bottom-left"/>
      <MiniMap
        pannable
        zoomable
        position="bottom-right"
        nodeColor={(node) => node.data?.color || "#8b5cf6"}
        maskColor="color-mix(in srgb, var(--bg) 75%, transparent)"
        style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8 }}
      />
    </ReactFlow>
  </div>;
}

export default function GraphCanvas(props) {
  return <ReactFlowProvider><GraphFlow {...props}/></ReactFlowProvider>;
}
