# Unibo Internship Offers Scraper and Viewer

This project provides a simple and clean interface for browsing internship offers. The official site has few filters and does not make it easy to find the right offer. This project provides a faster way to search through them.

The offers in `data/` are updated every day through GitHub Actions. Because web scraping is inherently volatile, always double-check each offer on the official site before relying on it.

[Open the viewer](https://zeno-mac.github.io/unibo-offerte-tirocini/viewer)

## Types of offers

The program scrapes and stores two types of offers:

- **Curricular internships:** Offers found [here](https://tirocini.unibo.it/tirocini/studenti/gestioneoffertetirocinio.htm?idTipoTirocinio=2&idCarriera=1).
- **Extracurricular offers:** Internships proposed by companies that accept autonomous applications. These companies are already affiliated with Unibo. The offers are listed [here](http://tirocini.unibo.it/tirocini/studenti/gestioneaziendeconautocandidature.htm).

The scraping routines for the two types are equivalent. They use different base URLs and configuration keys, which are stored in `scraper/config.json`.

Internships offered by the university itself are not included. The official site does not provide standardized offers for these internships to scrape and store.

## Scraper

The scraper is written in Python. It runs daily, downloads the data from the official site, cleans it, and saves it in `data/`.

The process has three main steps:

- **Login:** The site requires a session authentication token, so the program runs the SAML login routine every time.
- **Listing page scraping:** The program fetches the first listing page, saves the URLs of all offers, checks how many listing pages exist, and repeats the process for each page.
- **Offer page scraping:** Once all offer URLs have been retrieved, the program fetches each offer page and extracts its details. The information is then stored in the appropriate JSON file under `data/`.

The scraper uses a step-based routine. Different types of scraping can be run, such as curricular offers, extracurricular offers, or offers from a specific city or field, without changing the scraper source code. The step instructions are stored in a separate file passed as a command-line argument.

Each step specifies:

- The file in which to store the information.
- The type of offer, which tells the program how to process the data. These types are defined in `scraper/config.json`.
- The filters to apply to the requests, in the form of a payload.

## Viewer

The data is served by a static site generated with GitHub Pages. 

Key features include client-side keyword search, filtering by category and location, a toggleable grid/list layout, and local bookmarking. It is built using vanilla HTML, CSS, and modular ES6 JavaScript without any build steps.

For a detailed technical overview of the viewer's module architecture and design, see [docs/viewer.md](docs/viewer.md).

## GitHub Actions and automation

The whole process is automated with three GitHub workflows:

- **Scrape and refresh offers:** A cron job runs `main.py` every night with `steps.json` as an argument. The workflow also calculates the differences using `file_checker.py`, commits the updated files, and creates a pull request. It requires a GitHub PAT to trigger the next workflow.
- **Auto-merge:** This workflow is triggered whenever the previous workflow creates a pull request on the `data/refresh` branch. It checks the committed files, runs `validate.py` to test the new files, and approves the pull request only if all tests pass. Only JSON files in `data/` can be updated automatically.
- **Deploy static content to Pages:** This is the standard GitHub Pages workflow for serving static HTML files. It is configured to run only when files in `data/` or `viewer/` are modified.
