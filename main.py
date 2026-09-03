import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
import csv
from concurrent.futures import ThreadPoolExecutor
import itertools
import json
import sys


LISTING_PATH = "gestioneaziendeconautocandidature.htm"
BASE__URL = "https://tirocini.unibo.it/tirocini/studenti/"


def setup_payload():
    return {"data":
            {
                "denominazioneAzienda": "",
                "provincia": "351",
                "parolaChiave": "",
                "nazione": "",
                "settoreAttivita": "35",
                "_flagConvenzioneTPVPsicologia": "on",
                "cerca": "Search",
                "form_submit": "true",
            },
            }


def setup_cookies():
    load_dotenv()
    return {"JSESSIONID": os.getenv('JSESSIONID')}


def fetch_listing_page(url, cookies, payload, page_num=1):
    return requests.post(url+"?page="+str(page_num), cookies=cookies, data=payload)


def fetch_company_page(url, cookies):
    return requests.get(url=url, cookies=cookies)


def extract_companies(page, base_url):
    rows = []
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find('table', class_="iceDataTblOutline")
    rows += table.find_all('tr', class_="rigaPari")
    rows += table.find_all('tr', class_="rigaDispari")
    return [{"name": row.td.a.p.get_text(strip=True), "url": base_url+row.td.a["href"]} for row in rows]


def extract_company_info(page, url):
    soup = BeautifulSoup(page, "html.parser")
    table = soup.find("table", class_="tbSimpleData")
    list = {
        "Indirizzo dell'offerta": url
    }
    if table is None:
        print(f"  [WARN] nessuna tabella 'tbSimpleData' in {url}")
        return list
    for row in table.find_all("tr"):
        name = row.find("td", class_="formLabelNew")
        value = row.find("td", class_="value")
        if name and value:
            list[name.get_text(strip=True)] = value.get_text(
                separator=" ", strip=True)
    return list


def fetch_all_listing_pages(url, cookies, payload, max_pages=7, max_workers=3):
    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        results = list(ex.map(fetch_listing_page, itertools.repeat(
            url), itertools.repeat(cookies), itertools.repeat(payload), range(1, max_pages+1)))

    return results


def write_csv(file):
    fieldnames = list(dict.fromkeys(key for info in file for key in info))
    with open("files/log.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, restval="")
        writer.writeheader()
        writer.writerows(file)


def write_json(file):
    with open("files/log.json", "w") as f:
        json.dump(file, f, ensure_ascii=False, indent=2)


def format_number(number):
    return "0"*(3 - len(str(number))) + str(number)


def main():
    payload = setup_payload()
    cookies = setup_cookies()
    print("Fetching listing pages...")
    pages = fetch_all_listing_pages(url=BASE__URL+LISTING_PATH,
                                    cookies=cookies, payload=payload)
    companies = []
    print("Extracting companies urls...")
    for page in pages:
        companies += extract_companies(page.content, BASE__URL)

    companies_info = []
    print("Fetching and extracting companies pages...")
    counter = 1
    for company in companies:
        if (counter == 1):
            sys.stdout.write(
                f"Azienda {format_number(counter)}/{len(companies)}")
        else:
            sys.stdout.write("\b"*7)
            sys.stdout.write(f"{format_number(counter)}/{len(companies)}")
        sys.stdout.flush()
        counter += 1
        page = fetch_company_page(url=company["url"], cookies=cookies)
        companies_info.append(extract_company_info(
            page.content, company["url"]))

    write_csv(companies_info)
    write_json(companies_info)


if __name__ == "__main__":
    main()
