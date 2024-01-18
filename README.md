# iq.js

## About

This JavaScript library adds a **Query system for Iterables**.

You can even query your own fridge! (*as long as it's iterable*)
```js
import * as iq from "iq.js";

const fridge = [
    {
        itemName: "cheese",
        expiryDate: new Date("2024-01-15")
    },
    {
        itemName: "milk",
        expiryDate: new Date("2024-01-17")
    }
];

const todayDate = new Date("2024-01-16");
const query = iq.query()
    .where(c => c.expiryDate.getTime() <= todayDate.getTime())
    .select("itemName")
    .build();

query.on(fridge).foreach(console.log);
fridge.push({
    itemName: "fish sticks",
    expiryDate: new Date("2024-01-16")
});
query.extend()
    .map(s => s.toUpperCase())
    .on(fridge)
    .foreach(console.log);
```

**You can start feeling like a REAL web DEVELOPER TODAY!**

For real, this was a cool idea that came to mind, it's not supposed to be fast and/or efficient.
Though it makes for some cool readable code.

## Examples

Examples can be tried within this repo's [GitHub Pages Website](https://Marco4413.github.io/iq.js).
