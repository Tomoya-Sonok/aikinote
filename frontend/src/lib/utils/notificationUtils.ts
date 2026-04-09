const DELETED_REPLY_DISPLAY_HOURS = 24;

export function isWithinDeleteDisplayWindow(deletedAt: string): boolean {
  const deletedTime = new Date(deletedAt).getTime();
  return (
    Date.now() - deletedTime < DELETED_REPLY_DISPLAY_HOURS * 60 * 60 * 1000
  );
}
