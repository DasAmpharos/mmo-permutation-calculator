#!/usr/bin/env node

const uuid = require('uuid');
const getUuid = require('uuid-by-string');

const MIN_BATTLES = 2;
const MAX_BATTLES = 4;
const EVENT_REGEX = /([CB])(\d+)/;

class Seed {
    #uuid;
    #bytes;
    #counter;

    constructor(value) {
        this.#uuid = value;
        this.#bytes = uuid.parse(value);
        this.#counter = 0;
    }

    nextSeed(n) {
        let nextSeed = this.next(n, true);
        return new Seed(getUuid(nextSeed.toString()));
    }

    next(n, peek) {
        if (!n) n = 1;
        let copy = [...this.#bytes];
        let lastByte = copy[copy.length - 1];
        copy[copy.length - 1] = (lastByte + this.#counter + n) & 0xff;
        if (!peek) this.#counter += n;
        return uuid.stringify(copy);
    }

    toString() {
        return this.#uuid;
    }
}

class Horde {
    events;
    totalSpawns;

    constructor(totalSpawns) {
        this.events = Object.freeze(createEvents(totalSpawns));
        this.totalSpawns = totalSpawns;
    }

    static #spawn(seed, n, reseed) {
        if (reseed) seed = seed.nextSeed(n);
        return {seed, spawns: Array.from(Array(n), () => seed.next())};
    }

    simulateSpawns(initialSeed, nextHorde) {
        let totalSpawns = [];
        let simulations = [...this.events];
        while (simulations.length > 0) {
            let seed = new Seed(initialSeed);
            let events = simulations.shift().split(',');
            let spawns = Horde.#spawn(seed, 4).spawns;
            while (spawns.length <= this.totalSpawns && events.length !== 0) {
                let event = events.shift();
                let match = event.match(EVENT_REGEX);

                let type = match[1];
                let n = parseInt(match[2]);
                let newSpawns = Horde.#spawn(seed, n, type === 'B' && n >= MIN_BATTLES);
                spawns = spawns.concat(newSpawns.spawns);
                seed = newSpawns.seed;
            }

            if (spawns.length < this.totalSpawns) {
                let remainingSpawns = Horde.#spawn(seed, this.totalSpawns - spawns.length);
                spawns = spawns.concat(remainingSpawns.spawns);
            }
            let lastSpawn = spawns[spawns.length - 1];
            if (spawns.length > this.totalSpawns) {
                spawns.length = this.totalSpawns;
            }

            if (nextHorde) {
                spawns = spawns.concat(nextHorde.simulateSpawns(lastSpawn));
            }
            totalSpawns = totalSpawns.concat(spawns);
        }
        return totalSpawns;
    }
}

function createEvents(totalSpawns) {
    let events = new Set();
    events.add(`C${totalSpawns}`);
    createEventsRecursive(totalSpawns, events);
    return Array.from(events).sort();
}

function createEventsRecursive(remainingSpawns, events, event) {
    if (!event) event = '';
    if (remainingSpawns <= 0 || remainingSpawns <= 4) return;

    for (let nCatches = 0; nCatches < remainingSpawns; nCatches++) {
        let cEvent = `C${nCatches}`;
        for (let nBattles = MIN_BATTLES; nBattles <= MAX_BATTLES; nBattles++) {
            let bEvent = `B${nBattles}`;

            let components = event !== '' ? [event, bEvent] : [bEvent];
            let newEvent = components.join(',');
            if (!events.has(newEvent)) {
                events.add(newEvent);
                createEventsRecursive(remainingSpawns - nBattles, events, newEvent);
            }
            if (nCatches > 0 && nCatches < remainingSpawns - 4) {
                components = event !== '' ? [event, cEvent, bEvent] : [cEvent, bEvent];
                newEvent = components.join(',');
                if (!events.has(newEvent)) {
                    events.add(newEvent);
                    createEventsRecursive(remainingSpawns - nBattles - nCatches, events, newEvent);
                }
            }
        }
    }
}

(async function () {
    const seed = getUuid('0');
    let firstHorde = new Horde(9);
    // let secondHorde = new Horde(5);
    console.log(`events in first horde=${firstHorde.events.length}`);
    firstHorde.events.forEach((e) => console.log(e));
    // console.log(`events in second horde=${secondHorde.events.length}`);
    // secondHorde.events.forEach((e) => console.log(e));
    let uniqueSpawns = new Set(firstHorde.simulateSpawns(seed, undefined));
    console.log(uniqueSpawns);
})();
