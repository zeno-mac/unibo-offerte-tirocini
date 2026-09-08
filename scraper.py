
import requests
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
    """Holds the request context (cookies, headers, payload) and fetches
    listing and company pages with retry handling."""
    cookies = {}
    headers = {}
    payload = {}
    def __init__(self, cookies, headers, payload):
        self.cookies = cookies
        self.headers = headers
        self.payload = payload

    def fetch_listing_page(self, page_num: int = 1) -> requests.Response:
        """Input: page_num (int, 1-based). Uses self.cookies and self.payload.
        Output: requests.Response for that listing page.
        Retries up to MAX_RETRIES on HTTP/network errors or a wrong page
        number; raises MaxRetriesReached if they are all exhausted and
        SessionValidityError if the JSESSIONID is no longer valid."""
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

    
    def fetch_company_page(self, url: str) -> requests.Response:
        """Input: url (str) of a company page. Uses self.cookies.
        Output: requests.Response for that page.
        Retries up to MAX_RETRIES on HTTP/network errors; raises
        MaxRetriesReached once they are exhausted."""
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
        """Input: max_pages (int). Fetches listing pages 1..max_pages in order.
        Output: list of requests.Response, one per page. Propagates
        MaxRetriesReached / SessionValidityError from fetch_listing_page."""
        pages = []
        with Counter("Listing pages loaded", 1, max_pages) as counter:
            for i in range(1, max_pages+1):
                counter()
                page = self.fetch_listing_page(i)
                pages.append(page)
        return pages

def check_correct_page(data, page_num):
    """Input: data (requests.Response), page_num (int). Output: None.
    Raises WrongPageError if the response body is not the requested page
    (the site silently falls back to page 1 for out-of-range requests)."""
    if f"Pagina {page_num}/" not in data.text:
        raise WrongPageError(page_num)


def check_session(res: requests.Response) -> requests.Response:
    """Input: res (requests.Response). Output: the same response if the session
    is still valid; raises SessionValidityError if the JSESSIONID has expired
    (login page shown, or redirected to idp.unibo.it)."""

    if "La tua sessione" in res.text and "scaduta" in res.text or "idp.unibo.it" in res.url:
        raise SessionValidityError(
            "JSESSIONID is expired, please update .env"
        )
    return res





