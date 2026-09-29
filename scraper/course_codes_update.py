from scraper import Scraper
import scraper
import json
import parser
from login import login
from config import load_config
import sys

general_payload = {
    "denominazioneAzienda": "",
    "cerca": "Search",
    "_soloOfferteConAllegatoTpv": "on",
    "tipoCiclo": "ALL",
    "facolta": "ALL",
    "corso": "",
    "form_submit": "true"}


def setup_faculty_payload(code):
    return {
        "denominazioneAzienda": "",
        "cerca": "Search",
        "_soloOfferteConAllegatoTpv": "on",
        "tipoCiclo": "ALL",
        "facolta": code,
        "corso": "",
        "form_submit": "true"}


def setup_cookies() -> dict:
    """Input: None. Output: dict {'JSESSIONID': str}; performs the SAML login
    flow (login.login()) and returns the fresh session cookie."""
    print("Start Login")
    id = login()
    print("Finished login")
    return {"JSESSIONID": id}


def get_faculty_codes(cookies, config):
    sc = Scraper(cookies=cookies, payload=general_payload,
                 base_url=config["base_url"], headers={})
    print("Fetching faculty codes...")
    page = sc.fetch_listing_page()
    codes = parser.extract_faculty_codes(page.text)
    print(f"Found {len(codes.keys())} faculty codes")
    return codes


def get_course_codes(cookies, config, faculty_code, faculty_name):
    sc = Scraper(cookies=cookies, payload=setup_faculty_payload(faculty_code),
                 base_url=config["base_url"], headers={})
    print(f"Fetching course codes of {faculty_name}...")
    page = sc.fetch_listing_page()
    codes = parser.extract_courses_codes(page.text)
    print(f"Found {len(codes.keys())} courses codes for {faculty_name}")
    return codes

def main(config):
    cookies = setup_cookies()
    curr_config = config["curricular_internship"]
    faculty_codes = get_faculty_codes(cookies, curr_config)
    course_codes = {}
    for code in faculty_codes.keys():
        if code != "ALL":
            new_codes = get_course_codes(cookies, curr_config, code, faculty_codes[code])
            course_codes.update(new_codes)
    with open("data/course_codes.json", "w") as f:
        json.dump(course_codes, f, ensure_ascii=False, indent=2)
        
if __name__ == "__main__":
    try:
        config = load_config()
        main(config)
    except (scraper.SessionValidityError, scraper.MaxRetriesReached, parser.IncorrectHTMLlayout) as e:
        sys.exit(f"[ERROR] {e}")
