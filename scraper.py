
import requests
from typing import Optional
from counter import Counter
from time import sleep

MAX_RETRIES = 5

BASE__URL = "https://tirocini.unibo.it/tirocini/studenti/"
LISTING_URL = BASE__URL + "gestioneaziendeconautocandidature.htm"


class SessionValidityError(Exception):
    def __init__(self, msg="JSESSIONID is expired, please update .env"):
        super().__init__(msg)


class WrongPageError(Exception):
    def __init__(self, target):
        super().__init__(
            f"Incorrect page number after request, target: {target}")


class MaxRetriesReached(Exception):
    def __init__(self, url):
        super().__init__(f"Reached max attempts trying to fetch: {url}")


class Scraper():
    cookies = {}
    headers = {}
    payload = {}
    def __init__(self, cookies, headers, payload):
        self.cookies = cookies
        self.headers = headers
        self.payload = payload

    def fetch_listing_page(self, page_num: int = 1) -> Optional[requests.Response]:
        """Input: url (str), cookies (dict), payload (dict), page_num (int).
        Output: requests.Response of listing page or None in case of HTTP errors."""
        attempts = 0
        while attempts < MAX_RETRIES:
            try:
                res = requests.post(LISTING_URL+"?page="+str(page_num),
                                    cookies=self.cookies, data=self.payload)
                res.raise_for_status()
                check_session(res)
                check_correct_page(res, page_num)
                return res
            except requests.exceptions.HTTPError as e:
                print(
                    f"\n[WARNING] HTTP Error during fetching of {LISTING_URL+"?page="+str(page_num)}, error: {e}, headers: {res.headers}")
    
            except requests.exceptions.RequestException as e:
                print(
                    f"\n[WARNING] Error during fetching of {LISTING_URL+"?page="+str(page_num)}, error: {e}")
    
            except WrongPageError as e:
                print("\n[WARNING] " + str(e))
                print("Retrying...")
            attempts += 1
            sleep(0.5)
        raise MaxRetriesReached(LISTING_URL+"?page="+str(page_num))

    
    def fetch_company_page(self, url: str) -> Optional[requests.Response]:
        """Input: url (str) of the company page, cookies (dict).
        Output: requests.Response or None in case of HTTP errors."""
        attemps = 0
        while attemps < MAX_RETRIES:
            try:
                res = requests.get(url=url, cookies=self.cookies)
                res.raise_for_status()
                return res
            except (requests.exceptions.HTTPError, requests.exceptions.RequestException) as e:
                print(
                    f"\n[WARNING] Error during fetching of {url}, status code: {e}")
                print("Retrying...")
            attemps += 1
            sleep(0.5)
        raise MaxRetriesReached(url)

    def fetch_all_listing_pages(self, max_pages: int = 7) -> list[requests.Response]:
        """Input: url (str), cookies (dict), payload (dict), max_pages (int), max_workers (int).
        Output: lista di requests.Response (only if pages are correctly fetched)."""
        pages = []
        with Counter("Listing pages loaded", 1, max_pages) as counter:
            for i in range(1, max_pages+1):
                counter()
                page = self.fetch_listing_page(i)
                pages.append(page)
        return pages

def check_correct_page(data, page_num):
    if f"Pagina {page_num}/" not in data.text:
        raise WrongPageError(page_num)


def check_session(res: requests.Response) -> requests.Response:
    """Input: res (requests.Response). Output: same response if session is valid;
    raise SessionExpiredError if JSESSIONID is expired."""

    if "La tua sessione" in res.text and "scaduta" in res.text or "idp.unibo.it" in res.url:
        raise SessionValidityError(
            "JSESSIONID is expired, please update .env"
        )
    return res





