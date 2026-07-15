export default async function handler(req: any, res: any) {
  const { url } = req.query
  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter" })
    return
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CookbookBot/1.0)" },
    })
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` })
      return
    }
    const html = await upstream.text()
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.status(200).send(html)
  } catch {
    res.status(502).json({ error: "Failed to fetch URL" })
  }
}
