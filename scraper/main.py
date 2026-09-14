import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
import sys
from typing import Optional
from counter import Counter
from writer import write
from file_checker import check_differences, log_differences
import scraper
import parser
from login import login
from config import load_config


EXTRACURRICULAR_BASE_URL = "https://tirocini.unibo.it/tirocini/studenti/"
CURRICULAR_BASE_URL = "https://tirocini.unibo.it/tirocini/studenti/gestioneoffertetirocinio.htm"


def setup_extracurricular_payload() -> dict:
    """Input: None. Output: dict of search-form fields sent as the POST body
    of the extracurricular listing request (province, activity sector, keyword, ...)."""
    return {
        "denominazioneAzienda": "",
        "provincia": "351",
        "parolaChiave": "",
        "nazione": "",
        "settoreAttivita": "35",
        "_flagConvenzioneTPVPsicologia": "on",
        "cerca": "Search",
        "form_submit": "true",
    }


def setup_curricular_payload() -> dict:
    """Input: None. Output: dict of search-form fields sent as the POST body
    of the curricular listing request (province, activity sector, keyword, ...)."""
    return {
        "denominazioneAzienda": "",
        "cerca": "Search",
        "_soloOfferteConAllegatoTpv": "on",
        "tipoCiclo": "1",
        "facolta": "AMB9",
        "corso": "33",
        "form_submit": "true",
    }


def setup_cookies() -> dict:
    """Input: None. Output: dict {'JSESSIONID': str}; performs the SAML login
    flow (login.login()) and returns the fresh session cookie."""
    return {"JSESSIONID": login()}


def start_extracurricular_offers_scrape(cookies, payload, config):
    """Input: cookies (dict), payload (dict) from setup_cookies/setup_payload,
    config (dict) as returned by load_config(). Output: None.
    Fetches every listing page, extracts each company's URL, fetches and
    parses each company page, then writes the results to the path
    configured under config["extracurricular_internship"]."""
    sc = scraper.Scraper(cookies=cookies, payload=payload, headers={})
    pages = sc.fetch_all_extracurricular_listing_pages()

    print("Extracting companies urls...")
    offer_urls = []
    for page in pages:
        offer_urls += parser.extract_extracurricular_offer_links(
            page.text, EXTRACURRICULAR_BASE_URL)

    offer_info = []
    print("Fetching and extracting companies pages...")
    company_pages = sc.fetch_all_extracurricular_offer_pages(offer_urls)
    for url, page in zip(offer_urls, company_pages):
        offer_info.append(
            parser.extract_extracurricular_offer(page.text, url))

    print(f"Numero di offerte :{len(offer_info)}")
    write(offer_info, config["extracurricular_internship"]
          ["file_path"], config["extracurricular_internship"]["sorting_key"])


def start_extracurricular_offers_scrape(sc, config):
    """Input: cookies (dict), payload (dict) from setup_cookies/setup_payload,
    config (dict) as returned by load_config(). Output: None.
    Fetches every listing page, extracts each company's URL, fetches and
    parses each company page, then writes the results to the path
    configured under config["extracurricular_internship"]."""

    pages = sc.fetch_all_extracurricular_listing_pages()

    print("Extracting companies urls...")
    offer_urls = []
    for page in pages:
        offer_urls += parser.extract_extracurricular_offer_links(
            page.text, EXTRACURRICULAR_BASE_URL)

    offer_info = []
    print("Fetching and extracting companies pages...")
    company_pages = sc.fetch_all_extracurricular_offer_pages(offer_urls)
    for url, page in zip(offer_urls, company_pages):
        offer_info.append(
            parser.extract_extracurricular_offer(page.text, url))

    print(f"Numero di offerte :{len(offer_info)}")
    write(offer_info, config["extracurricular_internship"]
          ["file_path"], config["extracurricular_internship"]["sorting_key"])


def start_curricular_offers_scrape(sc):
    res = sc.fetch_curricular_listing_page()
    soup = BeautifulSoup(res.text, "html.parser")
    rows = len(soup.find_all("tr", class_="rigaPari")) + \
        len(soup.find_all("tr", class_="rigaDispari"))
    print(f"Offers found in curricular listing: {rows}")


def main(config) -> None:
    """Input: None. Output: None.
    Orchestrates the run: log in, fetch the listing pages, parse the company
    URLs out of them, fetch and parse each company page, then write the
    results to data/ and log the diff against the
    last committed version."""

    curr_payload = setup_curricular_payload()
    extracurr_payload = setup_extracurricular_payload()
    cookies = setup_cookies()

    sc = scraper.Scraper(cookies=cookies, curricular_payload=curr_payload,
                         extracurricular_payload=extracurr_payload, headers={})

    start_extracurricular_offers_scrape(sc, config=config)

    start_curricular_offers_scrape(sc)


if __name__ == "__main__":
    try:
        main(load_config())
    except (scraper.SessionValidityError, scraper.MaxRetriesReached, parser.IncorrectHTMLlayout) as e:
        sys.exit(f"[ERROR] {e}")
