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


BASE__URL = "https://tirocini.unibo.it/tirocini/studenti/"


def setup_payload() -> dict:
    """Input: None. Output: dict with form data (key : 'data')."""
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
    """Input: None (load JSESSIONID from .env). Output: dict {'JSESSIONID': str | None}."""
    # load_dotenv()
    # token = os.getenv('JSESSIONID')
    # if not token:
    #    raise SessionValidityError("[ERROR] JSESSIONID is missing in .env")
    return {"JSESSIONID": login()}


def main() -> None:
    """Input: None. Output: None; orchestrates fetch/parsing and writes files/log.csv and files/log.json."""
    payload = setup_payload()
    cookies = setup_cookies()
    print("Fetching listing pages...")

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
    write(companies_info, "files/log", "Ragione Sociale:")
    differences = check_differences(
        "", "files/log.json", ["Indirizzo dell'offerta:", "Ragione Sociale:"])
    log_differences(differences)


if __name__ == "__main__":
    try:
        main()
    except (scraper.SessionValidityError, scraper.MaxRetriesReached, parser.IncorrectHTMLlayout) as e:
        sys.exit(f"[ERROR] {e}")
