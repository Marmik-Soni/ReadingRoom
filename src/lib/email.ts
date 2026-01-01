export const getUnsendApiKey = () => {
  const key = process.env.UNSEND_API_KEY;
  if (!key) {
    throw new Error("UNSEND_API_KEY is not set.");
  }
  return key;
};

export const getUnsendHeaders = () => ({
  Authorization: `Bearer ${getUnsendApiKey()}`,
});

export const getDefaultFrom = () => process.env.UNSEND_FROM_EMAIL ?? "noreply@readingroom.dev";
