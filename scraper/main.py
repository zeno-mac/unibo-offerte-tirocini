import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
import sys
from typing import Optional
from counter import Counter
from writer import write
from file_checker import check_differences, log_differences
from scraper import Scraper
import scraper
import parser
from login import login
from config import load_config
import json
import sys

BASE_URL = "https://tirocini.unibo.it/tirocini/studenti/"


def setup_cookies() -> dict:
    """Input: None. Output: dict {'JSESSIONID': str}; performs the SAML login
    flow (login.login()) and returns the fresh session cookie."""
    print("Start Login")
    id = login()
    print("Finished login")
    return {"JSESSIONID": id}


def run_step(step, config):
    payload = step["payload"]
    cookies = setup_cookies()

    sc = Scraper(cookies=cookies, payload=payload,
                 base_url=config[step["type"]]["base_url"], headers={})
    pages = sc.fetch_all_listing_pages(max_pages=step["max_pages"])

    print("Extracting companies urls...")
    offer_urls = []
    for page in pages:
        offer_urls += parser.extract_extracurricular_offer_links(
            page.text, BASE_URL)

    offer_info = []
    print("Fetching and extracting companies pages...")
    company_pages = sc.fetch_all_offer_pages(offer_urls)

    for url, page in zip(offer_urls, company_pages):
        offer_info.append(
            parser.extract_extracurricular_offer(page.text, url))

    print(f"Numero di offerte :{len(offer_info)}")
    write(offer_info, config[step["type"]]
          ["file_path"], config[step["type"]]["sorting_key"])


def main(config):
    if len(sys.argv) < 2:
        print("[ERROR]: argument is needed")
        return
    with open(sys.argv[1], "r") as f:
        steps = json.load(f)
    for step in steps:
        run_step(step, config)


if __name__ == "__main__":
    try:
        config = load_config()
        main(config)
    except (scraper.SessionValidityError, scraper.MaxRetriesReached, parser.IncorrectHTMLlayout) as e:
        sys.exit(f"[ERROR] {e}")
