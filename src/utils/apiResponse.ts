export async function readApiResponse(response: Response) {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch {
    const message = response.status === 404
      ? 'This feature is unavailable on the server. Refresh the app after deployment finishes.'
      : response.status >= 500
        ? 'The server is temporarily unavailable. Check the listing status before trying again.'
        : 'The server returned an unexpected response. Refresh and check the listing status before trying again.';
    throw new Error(message);
  }
  if (!response.ok) throw new Error(typeof data?.message === 'string' ? data.message : `Request failed (${response.status}). Check the listing status before trying again.`);
  return data;
}
