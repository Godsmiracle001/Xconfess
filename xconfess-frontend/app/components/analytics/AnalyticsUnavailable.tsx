type Props = {
  reason?: string;
};

export function AnalyticsUnavailable({ reason }: Props) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
      <p className="font-medium">Analytics unavailable</p>
      {reason === "backend_error" && (
        <p className="mt-1">The server returned an error. Try again later.</p>
      )}
      {reason === "unavailable" && (
        <p className="mt-1">Could not reach the analytics service.</p>
      )}
    </div>
  );
}
