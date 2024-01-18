import * as iq from "../../iq.js";

function CompareISODates(d1, d2) {
    return new Date(d1).getTime() - new Date(d2).getTime();
}

async function FetchGitHubCommits(project) {
    const resp = await fetch(`https://api.github.com/repos/${project}/commits`);
    return await resp.json();
}

(async () => {
    const commits1 = await FetchGitHubCommits("Marco4413/TermVideoPlayer");
    const commits2 = await FetchGitHubCommits("Marco4413/CP77-DiscordRPC2");

    const query = iq.query()
        .select("commit")
        .select(["author", "message"])
        .where(o => CompareISODates(o.author.date, "2024-01-12") > 0)
        .take(5)
        .build();

    console.group("TermVideoPlayer Commits");
    query.extend()
        .select("message")
        .on(commits1)
        .iforeach(console.log);
    console.groupEnd();

    console.group("CP77RPC2 Commits");
    query.on(commits2)
        .foreach(console.log);
    console.groupEnd();
})();
