# Gedcom Visualizer

Ez a projekt egy családfa ábrázoló alkalmazás, amely lehetővé teszi a GEDCOM adatok feldolgozását és vizualizációját.

## Előzetes megjegyzés

Kérjük, nézd el a kód bizonyos részeinek szépséghibáit, mivel nem volt idő alapos cleanupra. A teljesítmény azonban rendben van. Szabadon módosíthatod a kódot, és várjuk a Pull Requesteket!

## Technikai követelmények

-   **Node.js 20** szükséges.
-   A projekt **TypeScript** alapú, minden típus deklarálva van.

## Telepítés és futtatás

1. Klónozd a repository-t.
2. Telepítsd a függőségeket:

    ```bash
    npm install
    ```

3. Indítsd el a fejlesztői módot:

    ```bash
    npm start
    ```

A fejlesztői módot a böngésződben a [http://localhost:5555](http://localhost:5555) címen érheted el.

## Használati lehetőségek

A projekt két fő módon használható:

### 1. UI-ként

Az alkalmazás egy teljes funkcionalitású családfa-rajzoló program:

-   **Kézi hozzáadás:** Emberek és kapcsolatok manuális hozzáadása.
-   **Automatikus generálás:** Egyenes ági fa vagy teljes genealógiai háló létrehozása.
-   **Exportálás:** A grafika exportálható PDF, SVG és PNG formátumokba.
-   **Családkönyv készítés:** PDF vagy WORD formátumban.

### 2. Library-ként

A projekt könyvtárként is használható a GEDCOM adatok feldolgozására. A fő komponens a `GedcomParser`, amely:

-   **Egész struktúrát visszaadja:** Indi-k (egyének), Fam-ok (családok), Object-ek (egyéb objektumok) stb.
-   **Példa használat:**

    ```typescript
    const indi = gedcom.indi("@I1@"); // Visszaadja az @I1@ azonosítójú személyt.
    const parents = indi.getParents(); // A szülők listáját adja vissza.
    const cousins = indi.getCousins(); // Az unokatestvérek listáját adja vissza.
    const grandfathers = indi.getGreatGrandFathers(); // A dédapák listáját adja vissza.
    ```

    Minden lista `ArrayLike` formátumú, szűrhető és rendezhető.

## Nyelvi támogatás

Az alkalmazás magyar és angol nyelven érhető el. Az **i18n** támogatásnak köszönhetően bármikor könnyedén bővíthető további nyelvekkel.

## Tesztek

Az eredeti repository tartalmazott teszteket, de azokat személyes információk miatt eltávolítottuk.

## Néhány egyéb funkció

-   Mobilbarát.
-   További exportálási lehetőségek: JSON és Excel formátumok támogatása.
-   Haladó szűrési és keresési funkciók integrálása a családfa könnyebb kezeléséhez.
