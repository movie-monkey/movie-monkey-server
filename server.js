const express = require("express");
const cheerio = require("cheerio");
const cors = require("cors");

const PORT = 3000;
const app = express();
app.use(cors());

const EXCLUDED = ["Chinese", "Chinese BG code", "Big 5 code"];

app.get("/", (_, res) => {
	res.json({ "@meta": "Welcome to the yifysubtitles.ch scraper. Use /movie_subtitles?imdb_id=<IMDB_ID> to get all the uploaded subtitles for that movie. Chinese is purposefully excluded!" });
});

app.get("/movie_subtitles", async (req, res) => {
	const imdb_id = req.query.imdb_id;
	const response = await fetch(`https://yifysubtitles.ch/movie-imdb/${imdb_id}`);
	const html = await response.text();
	const $ = cheerio.load(html);

	const $rows = $(".table-responsive > table.table.other-subs > tbody > tr").get();

	if ($rows.length === 0) {
		return res.json({ subtitles: [] });
	}

	const subtitles = $rows
		.map((row) => ({
			language: $(row).find("span.sub-lang").text(),
			rating: parseInt($(row).find(".rating-cell > span").text()),
			href: `https://yifysubtitles.ch${$(row).find("td:not(.uploader-cell) > a").attr("href").replace("subtitles", "subtitle")}.zip`,
			user: $(row).find(".uploader-cell > a").text(),
		}))
		.filter(({ rating }) => rating >= 0)
		.filter(({ user }) => user)
		.filter(({ language }) => !EXCLUDED.includes(language))
		.reduce((acc, sub) => {
			const existing = acc.find((item) => item.language === sub.language);
			if (!existing) {
				acc.push(sub);
			} else if (sub.rating > existing.rating) {
				acc[acc.indexOf(existing)] = sub;
			}

			return acc;
		}, []);

	res.json({ subtitles });
});

app.listen(PORT, () => {
	console.log(`Running on http://localhost:${PORT}`);
});
