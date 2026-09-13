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
from time import sleep
from login import login
from config import load_config


BASE__URL = "https://tirocini.unibo.it/tirocini/studenti/"

def setup_payload() -> dict:
    """Input: None. Output: dict of search-form fields sent as the POST body
    of the listing request (province, activity sector, keyword, ...)."""
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


def setup_cookies() -> dict:
    """Input: None. Output: dict {'JSESSIONID': str}; performs the SAML login
    flow (login.login()) and returns the fresh session cookie."""
    return {"JSESSIONID": login()}


def start_company_offers_scrape(cookies, payload, config):
    sc = scraper.Scraper(cookies=cookies, payload=payload, headers={})
    pages = sc.fetch_all_listing_pages(max_pages=7)
    companies = []
    print("Extracting companies urls...")
    for page in pages:
        companies += parser.extract_companies(page.text, BASE__URL)

    companies_info = []
    print("Fetching and extracting companies pages...")
    with Counter("Offer pages loaded", 1, len(companies)) as counter:
        for company in companies:
            counter()
            page = sc.fetch_company_page(url=company["url"])
            companies_info.append(parser.extract_company_info(
                page.text, company["url"]))

    print(f"Numero di offerte :{len(companies_info)}")
    write(companies_info, config["extracurricular_internship"]["file_path"], config["extracurricular_internship"]["sorting_key"])


def main(config) -> None:
    """Input: None. Output: None.
    Orchestrates the run: log in, fetch the listing pages, parse the company
    URLs out of them, fetch and parse each company page, then write the
    results to data/ and log the diff against the
    last committed version."""

    payload = setup_payload()
    cookies = setup_cookies()
    print("Fetching listing pages...")

    start_company_offers_scrape(cookies=cookies, payload=payload, config=config)


if __name__ == "__main__":
    try:
        main(load_config())
    except (scraper.SessionValidityError, scraper.MaxRetriesReached, parser.IncorrectHTMLlayout) as e:
        sys.exit(f"[ERROR] {e}")
