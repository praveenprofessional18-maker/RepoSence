let leaveGuard = null;

export function registerDocumentLeaveGuard(guard) {
  leaveGuard = guard;
  return () => {
    if (leaveGuard === guard) leaveGuard = null;
  };
}

export function confirmDocumentNavigation() {
  if (!leaveGuard) return true;
  const allowed = leaveGuard();
  if (allowed) leaveGuard = null;
  return allowed;
}
