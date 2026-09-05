import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
import sys
from typing import Optional
from counter import Counter
from writer import write
from file_checker import check_differences, log_differences
import re
from time import sleep


LISTING_PATH = "gestioneaziendeconautocandidature.htm"
BASE__URL = "https://tirocini.unibo.it/tirocini/studenti/"
MAX_RETRIES = 5

class SessionValidityError(Exception):
    def __init__(self, msg="JSESSIONID is expired, please update .env"):
        super().__init__(msg)

class WrongPageError(Exception):
    def __init__(self, target):
        super().__init__(f"Incorrect page number after request, target: {target}")

class IncorrectHTMLlayout(Exception):
    def __init__(self, target):
        super().__init__(f"Error during html parsing: {target}")

class MaxRetriesReached(Exception):
    def __init__(self, url):
        super().__init__(f"Reached max attempts trying to fetch: {url}")
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
    load_dotenv()
    token = os.getenv('JSESSIONID')
    if not token:
        raise SessionValidityError("[ERROR] JSESSIONID is missing in .env")
    return {"JSESSIONID": token}

def check_correct_page(data, page_num):
    if f"Pagina {page_num}/" not in data.text:
        raise WrongPageError(page_num)

def fetch_listing_page(url: str, cookies: dict, payload: dict, page_num: int = 1) -> Optional[requests.Response]:
    """Input: url (str), cookies (dict), payload (dict), page_num (int).
    Output: requests.Response of listing page or None in case of HTTP errors."""
    attempts = 0
    while attempts <MAX_RETRIES:
        try:
            res = requests.post(url+"?page="+str(page_num),
                                cookies=cookies, data=payload)
            res.raise_for_status()
            check_session(res)
            check_correct_page(res, page_num)
            return res
        except requests.exceptions.HTTPError as e:
            print(
                f"\n[WARNING] HTTP Error during fetching of {url+"?page="+str(page_num)}, status code: {res.status_code}, headers: {res.headers}")
            attempts += 1
            sleep(0.5)

        except requests.exceptions.RequestException as e:
            print(
                f"\n[WARNING] Error during fetching of {url+"?page="+str(page_num)}, status code:")
            attempts += 1
            sleep(0.5)

        except WrongPageError as e:
            print("[WARNING] " + str(e))
            print("Retrying...")
            attempts += 1
            sleep(0.5)
    raise MaxRetriesReached(url+"?page="+str(page_num))
    


def check_session(res: requests.Response) -> requests.Response:
    """Input: res (requests.Response). Output: same response if session is valid;
    raise SessionExpiredError if JSESSIONID is expired."""
    if "La tua sessione" in res.text and "scaduta" in res.text:
        raise SessionValidityError(
            "JSESSIONID is expired, please update .env"
        )
    return res


def fetch_company_page(url: str, cookies: dict) -> Optional[requests.Response]:
    """Input: url (str) of the company page, cookies (dict).
    Output: requests.Response or None in case of HTTP errors."""
    try:
        res = requests.get(url=url, cookies=cookies)
        res.raise_for_status()
    except:
        print(
            f"[WARNING] Error during fetching of {url}, status code: {res.status_code}")
        return None
    return res


def extract_companies(page: bytes, base_url: str) -> Optional[list[dict]]:
    """Input: page (bytes/str, HTML della pagina di elenco), base_url (str).
    Output: list of dict {'name': str, 'url': str}, or None if table is not present."""
    rows = []
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    if table is None:
        raise IncorrectHTMLlayout("table class=iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [{"name": row.td.a.p.get_text(strip=True), "url": re.sub(r"page=\d+&", "", base_url+row.td.a["href"])} for row in rows]


def extract_company_info(page: bytes, url: str) -> Optional[dict]:
    """Input: page (bytes/str, HTML of the company page), url (str).
    Output: dict {field: value} with "Offer url",
    or None if table is not present."""
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find("table", class_="tbSimpleData")
    dict = {
        "Indirizzo dell'offerta:": url
    }
    if table is None:
        raise IncorrectHTMLlayout("table class=tbSimpleData")
    for row in table.find_all("tr"):
        name = row.find("td", class_="formLabelNew")
        value = row.find("td", class_="value")
        if name and value:
            dict[name.get_text(strip=True)] = value.get_text(
                separator=" ", strip=True)
    return dict


def fetch_all_listing_pages(url: str, cookies: dict, payload: dict, max_pages: int = 7) -> list[requests.Response]:
    """Input: url (str), cookies (dict), payload (dict), max_pages (int), max_workers (int).
    Output: lista di requests.Response (only if pages are correctly fetched)."""
    pages = []
    with Counter("Listing pages loaded", 1, max_pages) as counter:
        for i in range(1, max_pages+1):
            counter()
            page = fetch_listing_page(url, cookies, payload, i)
            pages.append(page)
    return pages


def main() -> None:
    """Input: None. Output: None; orchestrates fetch/parsing and writes files/log.csv and files/log.json."""
    payload = setup_payload()
    cookies = setup_cookies()
    print("Fetching listing pages...")
    pages = fetch_all_listing_pages(url=BASE__URL+LISTING_PATH,
                                    cookies=cookies, payload=payload, max_pages=7)
    companies = []
    print("Extracting companies urls...")
    for page in pages:
        companies += extract_companies(page.text, BASE__URL)

    companies_info = []
    print("Fetching and extracting companies pages...")
    with Counter("Offer pages loaded", 1, len(companies)) as counter:
        for company in companies:
            counter()
            page = fetch_company_page(url=company["url"], cookies=cookies)
            companies_info.append(extract_company_info(
                page.text, company["url"]))

    print(f"Numero di offerte :{len(companies_info)}")
    write(companies_info, "files/log", "Ragione Sociale:")
    differences = check_differences("", "files/log.json", ["Indirizzo dell'offerta:", "Ragione Sociale:"])
    log_differences(differences)
    


if __name__ == "__main__":
    try:
        main()
    except (SessionValidityError, MaxRetriesReached, IncorrectHTMLlayout) as e:
        sys.exit(f"[ERROR] {e}")
