export const getUnosendApiKey = () => {
  const key = process.env.UNOSEND_API_KEY;
  if (!key) {
    throw new Error("UNOSEND_API_KEY is not set.");
  }
  return key;
};

export const getUnosendHeaders = () => ({
  Authorization: `Bearer ${getUnosendApiKey()}`,
});

export const getDefaultFrom = () => process.env.UNOSEND_FROM_EMAIL ?? "noreply@readingroom.dev";
