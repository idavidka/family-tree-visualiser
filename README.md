# Gedcom Visualizer

This project is a family tree visualization application that enables processing and visualizing GEDCOM data.

## Preliminary Note

Please excuse some imperfections in the code, as there was no time for a thorough cleanup. However, the performance is solid. Feel free to modify the code and submit Pull Requests!

## Technical Requirements

-   Requires **Node.js 20**.
-   The project is built with **TypeScript**, with all types properly declared.

## Installation and Running

1. Clone the repository.
2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:

    ```bash
    npm start
    ```

The development mode will be available in your browser at [http://localhost:5555](http://localhost:5555).

## Usage Options

The project can be used in two main ways:

### 1. As a UI

The application is a fully functional family tree drawing program:

-   **Manual Addition:** Add people and relationships manually.
-   **Automatic Generation:** Create a direct lineage tree or a complete genealogical network.
-   **Export:** The visualization can be exported in PDF, SVG, and PNG formats.
-   **Family Book Creation:** Generate a family book in PDF or WORD format.

### 2. As a Library

The project can also be used as a library to process GEDCOM data. The main component is `GedcomParser`, which:

-   **Provides the entire structure:** Includes Indi (individuals), Fam (families), Objects, etc.
-   **Example usage:**

    ```typescript
    const indi = gedcom.indi("@I1@"); // Returns the individual with ID @I1@.
    const parents = indi.getParents(); // Returns the list of parents.
    const cousins = indi.getCousins(); // Returns the list of cousins.
    const grandfathers = indi.getGreatGrandFathers(); // Returns the list of great-grandfathers.
    ```

    All lists are `ArrayLike`, filterable, and sortable.

## Language Support

The application is available in both Hungarian and English. Thanks to **i18n** support, additional languages can be easily added.

## Tests

The original repository included tests, but they were removed due to personal information in the mock GEDCOM files.

## Some other features

-   Mobile-friendly UI.
-   Additional export options: support for JSON and Excel formats.
-   Advanced filtering and search functionality for easier management of the family tree.
