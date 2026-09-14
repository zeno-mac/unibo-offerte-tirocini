
import requests
from counter import Counter
from time import sleep
from parser import extract_max_pages

MAX_RETRIES = 5

BASE__URL = "https://tirocini.unibo.it/tirocini/studenti/"
EXTRACURRICULAR_URL = BASE__URL + "gestioneaziendeconautocandidature.htm"
CURRICULAR_URL = BASE__URL + "gestioneoffertetirocinio.htm"


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
    extracurricular_payload = {}

    def __init__(self, cookies, headers, extracurricular_payload={}, curricular_payload={}):
        self.cookies = cookies
        self.headers = headers
        self.extracurricular_payload = extracurricular_payload
        self.curricular_payload = curricular_payload

    def fetch_all_extracurricular_offer_pages(self, urls):
        offer_pages = []
        with Counter("Offer pages loaded", 1, len(urls)) as counter:
            for company in urls:
                counter()
                page = self.fetch_extracurricular_offer(url=company)
                offer_pages.append(page)
        return offer_pages

    def fetch_extracurricular_listing_page(self, page_num: int = 1) -> requests.Response:
        """Input: page_num (int, 1-based). Uses self.cookies and self.payload.
        Output: requests.Response for that listing page.
        Retries up to MAX_RETRIES on HTTP/network errors or a wrong page
        number; raises MaxRetriesReached if they are all exhausted and
        SessionValidityError if the JSESSIONID is no longer valid."""
        attempts = 0
        while attempts < MAX_RETRIES:
            try:
                res = requests.post(EXTRACURRICULAR_URL+"?page="+str(page_num),
                                    cookies=self.cookies, data=self.extracurricular_payload)

                res.raise_for_status()
                check_session(res)
                check_correct_page(res, page_num)
                return res
            except requests.exceptions.HTTPError as e:
                print(
                    f"\n[WARNING] HTTP Error during fetching of {EXTRACURRICULAR_URL+"?page="+str(page_num)}, error: {e}, headers: {res.headers}")

            except requests.exceptions.RequestException as e:
                print(
                    f"\n[WARNING] Error during fetching of {EXTRACURRICULAR_URL+"?page="+str(page_num)}, error: {e}")

            except WrongPageError as e:
                print("\n[WARNING] " + str(e))
                print("Retrying...")
            attempts += 1
            sleep(0.5)
        raise MaxRetriesReached(EXTRACURRICULAR_URL+"?page="+str(page_num))

    def fetch_extracurricular_offer(self, url: str) -> requests.Response:
        """Input: url (str) of a company page. Uses self.cookies.
        Output: requests.Response for that page.
        Retries up to MAX_RETRIES on HTTP/network errors; raises
        MaxRetriesReached once they are exhausted."""
        attemps = 0
        while attemps < MAX_RETRIES:
            try:
                res = requests.get(url=url, cookies=self.cookies)
                res.raise_for_status()
                check_session(res)
                return res
            except (requests.exceptions.HTTPError, requests.exceptions.RequestException) as e:
                print(
                    f"\n[WARNING] Error during fetching of {url}, status code: {e}")
                print("Retrying...")
            attemps += 1
            sleep(0.5)
        raise MaxRetriesReached(url)

    def fetch_all_extracurricular_listing_pages(self, max_pages=None) -> list[requests.Response]:
        """Input: max_pages (int). Fetches listing pages 1..max_pages in order.
        Output: list of requests.Response, one per page. Propagates
        MaxRetriesReached / SessionValidityError from fetch_extracurricular_listing_page."""
        pages = []
        p = self.fetch_extracurricular_listing_page(1)
        pages.append(p)
        if max_pages is None:
            max_pages = extract_max_pages(p.content)
        with Counter("Listing pages loaded", 1, max_pages) as counter:
            counter()
            for i in range(2, max_pages+1):
                counter()
                page = self.fetch_extracurricular_listing_page(i)
                pages.append(page)
        return pages

    def fetch_curricular_listing_page(self, page_num=1):
        attempts = 0
        url = "https://tirocini.unibo.it/tirocini/studenti/gestioneoffertetirocinio.htm?idTipoTirocinio=2&idCarriera=1"
        while attempts < MAX_RETRIES:
            try:
                res = requests.post(url, cookies=self.cookies,
                                    data=self.curricular_payload)
                res.raise_for_status()
                check_session(res)
                check_correct_page(res, page_num)
                return res
            except requests.exceptions.HTTPError as e:
                print(
                    f"\n[WARNING] HTTP Error during fetching of {url}, error: {e}, headers: {res.headers}")

            except requests.exceptions.RequestException as e:
                print(
                    f"\n[WARNING] Error during fetching of {url}, error: {e}")

            except WrongPageError as e:
                print("\n[WARNING] " + str(e))
                print("Retrying...")
            attempts += 1
            sleep(0.5)
        raise MaxRetriesReached(EXTRACURRICULAR_URL+"?page="+str(page_num))

    def fetch_all_curricular_listing_pages(self, max_pages=None):
        # TODO
        return None

    def fetch_curricular_offer_page(self, url):
        # TODO
        return None

    def fetch_all_curricular_offer_pages(self, urls):
        # TODO
        return None


def check_correct_page(data, page_num):
    """Input: data (requests.Response), page_num (int). Output: None.
    Raises WrongPageError if the response body is not the requested page
    (the site silently falls back to page 1 for out-of-range requests)."""
    # If the listing page only has one page there is icePnlGrdRow1 tr containing the current page
    if ("icePnlGrdRow1" not in data.text):
        if (page_num != 1):
            raise WrongPageError(page_num)
        return
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
