import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os

def setup_config():
    load_dotenv()
    return {
            "url" : "https://tirocini.unibo.it/tirocini/studenti/gestioneaziendeconautocandidature.htm?page=",
            "data" : {
                "denominazioneAzienda": "",
                "provincia": "351",
                "parolaChiave": "",
                "nazione": "",
                "settoreAttivita": "35",
                "_flagConvenzioneTPVPsicologia": "on",
                "cerca": "Search",
                "form_submit": "true",
                },
            "cookie":{
                    "JSESSIONID" : os.getenv('JSESSIONID')
                }
                
        }

def send_post_req(config, index):
    return requests.post(config["url"]+str(index),headers="",cookies=config["cookie"],data=config["data"])


def main():
    config = setup_config()
    rows = []
    for i in range(1,8):
        res = send_post_req(config=config, index=i)
        soup = BeautifulSoup(res.content, "html.parser")
        table =  soup.find('table', class_ = "iceDataTblOutline")
        rows += table.find_all('tr', class_="rigaPari")
        rows += table.find_all('tr', class_="rigaDispari")
        
    list = []
    for row in rows:
        list.append((row.td.a["href"]))
    for item in list:
        print(item)
    print(f"Numero oggetti: {len(list)}")
if __name__ == "__main__":
    main()
    

    
    