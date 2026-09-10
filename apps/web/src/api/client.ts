export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `/api${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.error ??
        "Could not connect to Unclosed. Check that the local server is running.",
    );
  }
  return response.json();
}
