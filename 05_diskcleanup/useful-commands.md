# Useful Commands

## Start Local Server
Run from the `30Ducks` root directory so all projects are accessible:
```bash
cd ~/30Ducks
python3 -m http.server 8000
```
Then open **http://localhost:8000/05_diskcleanup/** in your browser.

## Check If Server Is Already Running
```bash
lsof -i :8000
```
If something is listed, the server is already up. If nothing, start it.

## Kill a Stuck Server
If port 8000 is in use but the page isn't loading:
```bash
kill $(lsof -t -i :8000)
```
Then restart with the command above.

## View All Projects
Open **http://localhost:8000/** to see the 30Ducks hub page.

## Count Objects in Dataset
```bash
grep -c 'n: "' ~/30Ducks/05_diskcleanup/js/data.js
```

## Browser Console API
Once the app is open, you can query the data from the browser dev tools console:
```js
window.__objects          // all 470 objects
window.__state            // current app state (filters, sort, etc.)
window.__store            // query engine functions

// examples
__store.filterByTag(__objects, 'room', 'kitchen')
__store.groupBySize(__objects)
__store.staleObjects(__objects, 365)   // unused for 1+ year
__store.potentialSpaceSaved(__objects) // liters from "considering" + "removed"
```
