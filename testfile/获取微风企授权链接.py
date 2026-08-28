import requests
import json

url = "https://honeycomb-test.sylinker.com/model/wfq/auth"

payload = json.dumps({
  "cburl": "https://www.baidu.com/",
  "orderNo": "hqq20260828000101",
  "typeWay": 1,
  "taxpayerId": "91ZZZZZZZZZZZZZZZZ",
  "companyName": "浙江某某某某某有限公司",
  "authenticationMsg": {
    "cognizantMobile": "1",
    "cognizantName": "1",
    "authenticationResult": ""
  },
  "prodId": "WFQ_AUTH",
  "token": "J0xmJ1ux1eHrkINt",
  "requestTime": "2026-08-28 10:20:34",
  "requestNo": "kzgbls29zq3lkw8rsw",
  "sign": "c11EsTe8JQUkXViyfglgr83Wlo+pfEB1tbIWNPi6tjq5O/SCApksorIj2X74j3Ah71UQibLuzE+pP6ilClQ3TShH+2YNbZJ8tDDgu/qLvB0hJDUmHMFYxXsslBA73e7wWu5q3kCYVLpBbVQdrCvyISsVb9ti74s5GPOk0wTHI6U="
})
headers = {
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)
