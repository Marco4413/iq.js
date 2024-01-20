/**
 * @file An Iterable Querying library.
 * @author
 * Marco4413 <{@link https://github.com/Marco4413}>
 * @license
 * Copyright (c) 2024 Marco4413 ({@link https://github.com/Marco4413/iq.js})
 * 
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @typedef {(it: Iterable<any>|IterableIterator<any>) => any} QueryRule
 * A QueryRule is a generator function which takes an Iterable and yields values.
 * The produced value can be an Iterable, in which case, another QueryRule may be applied.
 * @typedef {QueryRule} SelectRule
 * A SelectRule creates a new object from values of an Iterable which contains only some keys.
 * If `fields` is a string only one field is unwrapped and no new object is created.
 * @typedef {QueryRule} WhereRule
 * A WhereRule filters values of an Iterable with some predicate function.
 * @typedef {QueryRule} FlatRule
 * A FlatRule unwraps n values of an Iterable which are themselves iterable.
 * If n < 0 ALL values are unwrapped.
 * @typedef {QueryRule} TakeRule
 * A TakeRule yields only the first n values of an Iterable.
 * @typedef {QueryRule} SkipRule
 * A SkipRule skips the first n values of an Iterable.
 * @typedef {QueryRule} MapRule
 * A MapRule mutates values of an Iterable through a function.
 */

/**
 * Builds a new {@link SelectRule} bound to `fields`.
 * @param {string|string[]} fields
 * @returns {SelectRule}
 */
export function BuildSelectRule(fields) {
    const fieldsIsArray = Array.isArray(fields);
    if (fieldsIsArray) {
        return function*(it) {
            for (const val of it) {
                const obj = {};
                for (const field of fields)
                    obj[field] = val[field];
                yield obj;
            }
        };
    }

    return function*(it) {
        for (const val of it)
            yield val[fields];
    };
}

/**
 * Builds a new {@link WhereRule} bound to `fn`.
 * @param {(value: any, i: number) => boolean} fn
 * @returns {WhereRule}
 */
export function BuildWhereRule(fn) {
    return function*(it) {
        let i = 0;
        for (const val of it) {
            if (fn(val, i++))
                yield val;
        }
    };
}

/**
 * Builds a new {@link FlatRule} bound to `n`.
 * @param {number} [n]
 * @returns {FlatRule}
 */
export function BuildFlatRule(n=-1) {
    return function*(it) {
        let flattened = 0;
        for (const val of it) {
            if (n >= 0 && flattened >= n)
                break;
            yield* val;
            flattened++;
        }
    };
}

/**
 * Builds a new {@link TakeRule} bound to `n`.
 * @param {number} n
 * @returns {TakeRule}
 */
export function BuildTakeRule(n) {
    return function*(it) {
        let taken = 0;
        for (const val of it) {
            if (taken >= n)
                break;
            yield val;
            taken++;
        }
    };
}

/**
 * Builds a new {@link SkipRule} bound to `n`.
 * @param {number} n
 * @returns {SkipRule}
 */
export function BuildSkipRule(n) {
    return function*(it) {
        let skipped = 0;
        for (const val of it) {
            if (skipped >= n)
                yield val;
            skipped++;
        }
    };
}

/**
 * Builds a new {@link MapRule} bound to `fn`.
 * @param {(value: any, i: number) => any} fn
 * @returns {MapRule}
 */
export function BuildMapRule(fn) {
    return function*(it) {
        let i = 0;
        for (const val of it)
            yield fn(val, i++);
    };
}

/** @implements {Iterable<any>} */
export class QueryExecutor {
    /**
     * @param {QueryRule} query Usually a compiled {@link QueryRule} from {@link Query.compile}.
     * @param {Iterable<any>?} [iterable]
     */
    constructor(query, iterable=null) {
        /** @type {QueryRule} Holds the compiled query to run. */
        this.query = query;
        /** @type {Iterable<any>?} The iterable to iterate with `this.query`. */
        this.iterable = iterable;
    }

    /** @returns {Iterator<any>} */
    *[Symbol.iterator]() { yield* this.query(this.iterable); }

    /**
     * Calls `fn` for each value of `this`.
     * @param {(value: any) => void} fn
     */
    foreach(fn) { for (const val of this) fn(val); }

    /**
     * Calls `fn` for each value of `this` and its "index".
     * @param {(value: any, i: number) => void} fn
     */
    iforeach(fn) {
        let i = 0;
        for (const val of this)
            fn(val, i++);
    }

    /**
     * Collects all values into an array by iterating over `this`.
     * @returns {any[]}
     */
    collect() { return Array.from(this); }

    /**
     * Calls `fn` for each value of `this` and returns all values as a Promise.
     * This function can also be used as an async iforeach.
     * If `fn` is not provided then it's the identity function.
     * @param {(value: any, i: number) => Promise<any>|any} [fn] An async function which should fulfill when the query value is ready.
     * @returns {Promise<any[]>}
     */
    acollect(fn=(x=>x)) {
        let i = 0;
        const promises = [];
        for (const val of this)
            promises.push(fn(val, i++));
        return Promise.all(promises);
    }

    /**
     * Sets `this.iterable` and returns `this`.
     * @param {Iterable<any>} iterable
     * @returns {QueryExecutor} `this`
     */
    on(iterable) {
        this.iterable = iterable;
        return this;
    }

    /**
     * Extends `this.query` by creating a new {@link Query} with `this.query` as its first rule.
     * @example
     * qexe.extend()
     *     .select("message")
     *     .on([{message: "Hello World!"}])
     *     .foreach(console.log);
     * @returns {Query}
     */
    extend() { return new Query([this.query]); }
}

export class Query {
    /**
     * Creates a new query out of the specified iterable and with the specified rules.
     * Arguments are to be provided ONLY if you know what you're doing.
     * @param {QueryRule[]} [rules]
     */
    constructor(rules=[]) {
        this.rules = rules;
    }

    /**
     * Pushes a rule in `this.rules` and returns `this`.
     * @private Used internally to allow one-liners in implementations.
     * @param {QueryRule} rule The rule to add.
     * @returns {this}
     */
    _pushrule(rule) {
        this.rules.push(rule);
        return this;
    }

    /** @param {string|string[]} fields */
    select(fields) { return this._pushrule(BuildSelectRule(fields)); }
    /** @param {(value: any, i: number) => boolean} fn */
    where(fn) { return this._pushrule(BuildWhereRule(fn)); }
    /** @param {number} [n] */
    flat(n) { return this._pushrule(BuildFlatRule(n)); }
    /** @param {number} n */
    take(n) { return this._pushrule(BuildTakeRule(n)); }
    /** @param {number} n */
    skip(n) { return this._pushrule(BuildSkipRule(n)); }
    /** @param {(value: any, i: number) => any} fn */
    map(fn) { return this._pushrule(BuildMapRule(fn)); }
    
    /**
     * Compiles `this.rules` into a single {@link QueryRule}.
     * @returns {QueryRule}
     */
    compile() {
        if (this.rules.length > 0) {
            let compiled = this.rules[0];
            for (let i = 1; i < this.rules.length; i++) {
                // Let arrow function capture previously compiled query
                const prevCompiled = compiled;
                const rule = this.rules[i];
                compiled = it => rule(prevCompiled(it));
            }
            return compiled;
        }

        return function*(it) { yield* it; };
    }

    /**
     * The same as calling {@link Query.on()} with no arguments.
     * @returns {QueryExecutor}
     */
    build() { return this.on(); }

    /**
     * Creates a new {@link QueryExecutor} from `this.rules` and the specified iterable.
     * @param {Iterable<any>} [iterable]
     * @returns {QueryExecutor}
     */
    on(iterable) { return new QueryExecutor(this.compile(), iterable); }

    /**
     * Creates a copy of `this`.
     * It's useful for extending a {@link Query}.
     * @example
     * const query = iq.query().take(1);
     * const data1 = [ "World" ];
     * const data2 = [ { val: "Hello" }, "World" ];
     * query.extend()     // If not cloned, the call to select would modify the query
     *     .select("val")
     *     .on(data2)
     *     .foreach(console.log); // "Hello"
     * query.on(data1)
     *     .foreach(console.log); // "World"
     * @returns {Query}
     */
    extend() { return new Query([this.compile()]); }

    /**
     * Packs `this.rules` by setting it to `[this.compile()]`.
     * @returns {this}
     */
    pack() {
        if (this.rules.length > 0)
            this.rules = [this.compile()];
        return this;
    }
}

export function query() { return new Query(); }
