export const mockReactFiles = {
  "packages/react/src/ReactClient.js": `import { createElement } from "./ReactElement";
import { resolveDispatcher } from "./ReactHooks";

export { createElement as jsx, resolveDispatcher };`,
  "packages/react/src/ReactElement.js": `import { REACT_ELEMENT_TYPE } from "../../shared/ReactSymbols";

export function createElement(type, props, children) {
  return { $$typeof: REACT_ELEMENT_TYPE, type, props, children };
}`,
  "packages/react/src/ReactHooks.js": `import { ReactSharedInternals } from "../../shared/ReactSharedInternals";

export function resolveDispatcher() {
  return ReactSharedInternals.currentDispatcher;
}`,
  "packages/react/src/ReactContext.js": `import { REACT_CONTEXT_TYPE } from "../../shared/ReactSymbols";

export function createContext(value) {
  return { $$typeof: REACT_CONTEXT_TYPE, value };
}`,
  "packages/react/src/ReactChildren.js": `import { createElement } from "./ReactElement";

export function mapChildren(children, mapper) {
  return children.map((child, index) => mapper(createElement(child), index));
}`,
  "packages/react/src/ReactForwardRef.js": `import { createElement } from "./ReactElement";

export function forwardRef(render) {
  return (props, ref) => render(props, ref);
}`,
  "packages/react/src/ReactMemo.js": `import { createElement } from "./ReactElement";

export function memo(component) {
  return (props) => createElement(component, props);
}`,
  "packages/react/src/ReactFragment.js": `import { REACT_FRAGMENT_TYPE } from "../../shared/ReactSymbols";

export const Fragment = REACT_FRAGMENT_TYPE;`,
  "packages/react/src/ReactVersion.js": `export const version = "19.0.0";`,
  "packages/react/src/ReactServer.js": `import { createElement } from "./ReactElement";

export function renderToModel(element) {
  return createElement(element.type, element.props, element.children);
}`,
  "packages/react-dom/client.js": `import { createRootImpl } from "./src/ReactDOMRoot";
import { performSyncWork } from "../react-reconciler/src/ReactFiberWorkLoop";

export function createRoot(container) {
  return createRootImpl(container, performSyncWork);
}`,
  "packages/react-dom/server.js": `import { REACT_ELEMENT_TYPE } from "../shared/ReactSymbols";

export function renderToString(element) {
  return element.$$typeof === REACT_ELEMENT_TYPE ? String(element.type) : "";
}`,
  "packages/react-dom/src/ReactDOMRoot.js": `import { performSyncWork } from "../../react-reconciler/src/ReactFiberWorkLoop";
import { ReactSharedInternals } from "../../shared/ReactSharedInternals";

export function createRootImpl(container) {
  return { container, render: performSyncWork, internals: ReactSharedInternals };
}`,
  "packages/react-dom/src/ReactDOMComponent.js": `import { REACT_ELEMENT_TYPE } from "../../shared/ReactSymbols";

export function isReactElement(value) {
  return value?.$$typeof === REACT_ELEMENT_TYPE;
}`,
  "packages/react-reconciler/src/ReactFiber.js": `import { renderWithHooks } from "./ReactFiberHooks";

export function beginWork(fiber) {
  return renderWithHooks(fiber);
}`,
  "packages/react-reconciler/src/ReactFiberHooks.js": `import { ReactSharedInternals } from "../../shared/ReactSharedInternals";

export function renderWithHooks(fiber) {
  return { fiber, dispatcher: ReactSharedInternals.currentDispatcher };
}`,
  "packages/react-reconciler/src/ReactFiberWorkLoop.js": `import { beginWork } from "./ReactFiber";
import { scheduleCallback } from "../../scheduler/src/Scheduler";

export function performSyncWork(fiber) {
  return scheduleCallback(() => beginWork(fiber));
}`,
  "packages/shared/ReactSymbols.js": `export const REACT_ELEMENT_TYPE = Symbol.for("react.element");
export const REACT_CONTEXT_TYPE = Symbol.for("react.context");
export const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");`,
  "packages/shared/ReactSharedInternals.js": `import { REACT_CONTEXT_TYPE } from "./ReactSymbols";

export const ReactSharedInternals = {
  currentDispatcher: null,
  contextType: REACT_CONTEXT_TYPE
};`,
  "packages/scheduler/src/Scheduler.js": `const schedulerPackage = require("scheduler");

export function scheduleCallback(callback) {
  return schedulerPackage.unstable_scheduleCallback
    ? schedulerPackage.unstable_scheduleCallback(schedulerPackage.unstable_NormalPriority, callback)
    : callback();
}`
};

function insertFile(tree, path, size) {
  const parts = path.split("/");
  let siblings = tree;
  let prefix = "";
  for (let index = 0; index < parts.length; index += 1) {
    const name = parts[index];
    prefix = prefix ? `${prefix}/${name}` : name;
    const isFile = index === parts.length - 1;
    let node = siblings.find((item) => item.name === name);
    if (!node) {
      node = isFile
        ? { name, path: prefix, type: "file", size }
        : { name, path: prefix, type: "folder", children: [] };
      siblings.push(node);
    } else {
      node.path = prefix;
      if (isFile) {
        node.type = "file";
        node.size = size;
      }
    }
    if (!isFile) {
      node.type = "folder";
      node.children ||= [];
      siblings = node.children;
    }
  }
}

function sortTree(nodes) {
  nodes.sort((left, right) => {
    if (left.type !== right.type) return left.type === "folder" ? -1 : 1;
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base", numeric: true });
  });
  for (const node of nodes) {
    if (node.children) sortTree(node.children);
  }
}

export function applyMockReactGraph(repo) {
  repo.files = { ...repo.files, ...mockReactFiles };
  for (const [path, content] of Object.entries(mockReactFiles)) {
    insertFile(repo.tree, path, new TextEncoder().encode(content).length);
  }
  sortTree(repo.tree);
  return repo;
}
