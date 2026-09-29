from bs4 import BeautifulSoup
import re
import json


class IncorrectHTMLlayout(Exception):
    def __init__(self, target):
        super().__init__(f"Error during html parsing: {target}")


def extract_offer_urls(page: bytes, base_url: str) -> list[str]:
    """Input: page (bytes/str, HTML of a listing page), base_url (str).
    Output: list of url : str, one per company row, with
    the 'page=N&' query param stripped from each URL.
    Raises IncorrectHTMLlayout if the results table is missing."""
    rows = []
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    if table is None:
        raise IncorrectHTMLlayout("table class=iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [re.sub(r"page=\d+&", "", base_url+row.td.a["href"]) for row in rows]


def extract_offer_info(page: bytes, url: str) -> dict:
    """Input: page (bytes/str, HTML of a company page), url (str).
    Output: dict {field label: value} scraped from the detail table, plus
    "Indirizzo dell'offerta:" set to url.
    Raises IncorrectHTMLlayout if the detail table is missing."""
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find("table", class_="tbSimpleData",
                      summary="Tabella di struttura")
    dict = {
        "Indirizzo dell'offerta:": url
    }
    if table is None:
        raise IncorrectHTMLlayout("table class=tbSimpleData")
    for row in table.find_all("tr"):
        name = row.find("td", class_="formLabelNew")
        value = row.find("td", class_="value")
        if name and value:
            # Needs to split "Corsi:" field in curricular internship in order to keep the json consistent
            if name.get_text(strip=True) == "Corsi:":
                val = extract_courses(
                    value.get_text(separator=" ", strip=True))
            else:
                val = value.get_text(separator=" ", strip=True)
            dict[name.get_text(strip=True)] = val
    return dict


def extract_max_pages(page):
    """Input: page (bytes/str, HTML of a listing page). Output: int, the
    total number of listing pages read from the "Pagina X/Y" pager text.
    Raises IncorrectHTMLlayout if the pager cell or its text is missing."""
    soup = BeautifulSoup(page, "html.parser")
    td = soup.find("td", class_="icePnlGrdColumn2")
    if td is None:
        print("[WARNING] No max_page found, defaulting to 1...")
        return 1
    match = re.search(r"Pagina\s+\d+/(\d+)", td.get_text())
    if match is None:
        print("[WARNING] No max_page found, defaulting to 1...")
        return 1
    return int(match.group(1))


def extract_courses(vals):
    # Duplicate removal is needed because "INGEGNERIA INFORMATICA - Ingegneria e architettura" is always present with two codes 155 and 159
    return sorted({
        convert_course_name(course.strip())
        for course in vals.split("(")
        if course.strip()
    })


def extract_courses_codes(page):
    soup = BeautifulSoup(page, "html.parser")
    select = soup.find("select", id="corso")
    if select is None:
        raise IncorrectHTMLlayout('select id="corso"')
    codes = {}
    for option in select.find_all("option"):
        code = option['value']
        name = option.get_text(separator=" ", strip=True).replace(
            "\t", "").replace("\n", " ")
        codes[code] = name
    return codes


def extract_faculty_codes(page):
    soup = BeautifulSoup(page, "html.parser")
    select = soup.find("select", id="facolta")
    if select is None:
        raise IncorrectHTMLlayout('select id="facolta"')
    codes = {}
    for option in select.find_all("option"):
        code = option['value']
        name = option.get_text(separator=" ", strip=True).replace(
            "\t", "").replace("\n", " ")
        codes[code] = name
    return codes


def convert_course_name(name):
    # Example of a name:  "(34 ) INFORMATICA - Scienze"
    # TODO Improve file reading placement
    with open("data/course_codes.json", "r") as f:
        codes = json.load(f)
    match = re.search(r"\d+", name)
    if match is None:
        print(f"[WARNING] No number: '{name}'")
        return name
    return codes[str(match.group(0))]
