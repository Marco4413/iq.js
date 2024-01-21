import * as iq from "../../iq.js";

async function FetchGitHubUser(username) {
    const resp = await fetch(`https://api.github.com/users/${username}`);
    return await resp.json();
}

(async () => {
    const users = [
        await FetchGitHubUser("Marco4413"),
        await FetchGitHubUser("RealPlanet")
    ];

    const queryUserEvents = iq.query()
        .select(["created_at", "public", "repo", "type", "actor"])
        .map(event => {
            event.actor = {
                login: event.actor.login,
                id: event.actor.id
            };
            return event;
        })
        .build();

    const queryUserInfo = iq.query()
        .select(["login", "name", "id", "location", "events_url", "created_at"])
        .map(user => {
            // user is shallow-copied from the original
            //  (because select was called with multiple fields)
            //  so it is safe to modify immutable entries. 
            const eventsUrl = user.events_url.replace("{/privacy}", "/public");
            user.events_url = eventsUrl;
            user.events = (async () => {
                const resp = await fetch(eventsUrl);
                user.events = queryUserEvents
                    .extend()
                    .take(5)
                    .on(await resp.json())
                    .collect();
            })();
            // Passing an async function to .map is possible but breaks .select, .flat ...
            // Because they DO NOT await for the Promise to be fulfilled.
            // If you really need to do it, use .map only at the end of a query.
            // And be carefull that you can't extend it easily.
            // The better way is doing what this example does:
            //  set only a few fields to Promises, and await them with .acollect.
            console.group(".map user.events");
            console.log(user.events);
            console.groupEnd();
            return user;
        })
        .build();

    await queryUserInfo
        .on(users)
        .acollect(async user => {
            console.group(".acollect user.events");
            console.log(user.events);
            console.groupEnd();
            await user.events;
            // Here we can do our async collect and/or foreach.
            // Then the main function can await the return value
            //  of .acollect to wait for all Promises to fulfill.
            console.group(".acollect awaited user.events");
            console.log(user);
            console.groupEnd();
            // If user was mapped to a Promise (async function passed to .map), you could `await user`
        });
})();
