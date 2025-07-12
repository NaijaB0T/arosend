import requests

cookies = {
    'kdt': 'gLTAld7RR9RWogkkj7ld6SIvyNbaLcL8gjHUIa6l',
    'dnt': '1',
    'guest_id': 'v1%3A174808507908900969',
    'guest_id_marketing': 'v1%3A174808507908900969',
    'guest_id_ads': 'v1%3A174808507908900969',
    'auth_token': '74dc1345e2dad765e40c0e7c051185aa0f04b9ef',
    'ct0': 'a4a052b66c7f87161176633a00e2c4d80d33d02b96f435943280bddb2db3d947c77989a6b24a686f0b073eac92fc6018217a85c5e203b895c8179fd690920130038eebd0176e69f5711aa41b268acc52',
    'twid': 'u%3D1117329087092219911',
    'personalization_id': '"v1_+9v1aEUBXG8886IpIR+G4Q=="',
    'd_prefs': 'MjoxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw',
    'lang': 'en',
    '__cf_bm': 'yG2.vLZAjB_W2JhDnDi1fIhvubEYlgl5inmhYqo1ScE-1752324418-1.0.1.1-qCqrIZ1eY4Bib5A2MJjgZBTyP2g9Ch.1.TR6gtmwVkmtppcx50tNaW1cfQvWhngFj9444fsCi8YOLZ6DvIYVKI7xBr2XPDIkyWF2DXrKGmw',
}

headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.5',
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'origin': 'https://x.com',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://x.com/messages/1094275595247239168-1117329087092219911',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'x-client-transaction-id': '8aCKk0cN269fLnLoa/aIN+rsZ7P6BaVQGuolx+q/hxSmNDi+1QYVADesE23e0S1B6dYH0/U+XCTJfrsAiA0tbYl3YpqG8g',
    'x-csrf-token': 'a4a052b66c7f87161176633a00e2c4d80d33d02b96f435943280bddb2db3d947c77989a6b24a686f0b073eac92fc6018217a85c5e203b895c8179fd690920130038eebd0176e69f5711aa41b268acc52',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': 'en',
    'x-xp-forwarded-for': '516b3052ada6190aab3ff770628e6a56ab9824b44e3de56dd71fc1edcb6a225bd49bfe8064b937ebc87d0dd46e03f27a7d1f112b2335a55dd30d9cbedb402ad289c2d78884d8bd4ac2290a6d18e274a3a19768b261270f5ad6e6540c9f1e036808b08b1cb5bb9035fc4ad19b216a9b156d846ea7deb79f7f6e8af00ca7d7332394e728a75c2a3f5890eb7488e6ed67fef0e3ed3a4f0228de968ab3d8e9128305b0248b17274d2e1d51c99bb2728826cb044c8d2b40a0c294667fb3b5afa2e5bb4aae19eb2f5cfdcf56f0a9e92f31524f781efb9bd128c483984f9c0977f4c77047b0b60b11f8c7816689971d9499a07b402cd739a9ad278d4334fb',
    # 'cookie': 'kdt=gLTAld7RR9RWogkkj7ld6SIvyNbaLcL8gjHUIa6l; dnt=1; guest_id=v1%3A174808507908900969; guest_id_marketing=v1%3A174808507908900969; guest_id_ads=v1%3A174808507908900969; auth_token=74dc1345e2dad765e40c0e7c051185aa0f04b9ef; ct0=a4a052b66c7f87161176633a00e2c4d80d33d02b96f435943280bddb2db3d947c77989a6b24a686f0b073eac92fc6018217a85c5e203b895c8179fd690920130038eebd0176e69f5711aa41b268acc52; twid=u%3D1117329087092219911; personalization_id="v1_+9v1aEUBXG8886IpIR+G4Q=="; d_prefs=MjoxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw; lang=en; __cf_bm=yG2.vLZAjB_W2JhDnDi1fIhvubEYlgl5inmhYqo1ScE-1752324418-1.0.1.1-qCqrIZ1eY4Bib5A2MJjgZBTyP2g9Ch.1.TR6gtmwVkmtppcx50tNaW1cfQvWhngFj9444fsCi8YOLZ6DvIYVKI7xBr2XPDIkyWF2DXrKGmw',
}

params = {
    'ext': 'mediaColor,altText,mediaStats,highlightedLabel,parodyCommentaryFanLabel,voiceInfo,birdwatchPivot,superFollowMetadata,unmentionInfo,editControl,article',
    'include_ext_alt_text': 'true',
    'include_ext_limited_action_results': 'true',
    'include_reply_count': '1',
    'tweet_mode': 'extended',
    'include_ext_views': 'true',
    'include_groups': 'true',
    'include_inbox_timelines': 'true',
    'include_ext_media_color': 'true',
    'supports_reactions': 'true',
    'supports_edit': 'true',
}

json_data = {
    'conversation_id': '866414443-1117329087092219911',
    'recipient_ids': False,
    'text': '90876',
    'cards_platform': 'Web-12',
    'include_cards': 1,
    'include_quote_count': True,
    'dm_users': False,
}

response = requests.post('https://x.com/i/api/1.1/dm/new2.json', params=params, cookies=cookies, headers=headers, json=json_data)

# Note: json_data will not be serialized by requests
# exactly as it was in the original request.
#data = '{"conversation_id":"1094275595247239168-1117329087092219911","recipient_ids":false,"request_id":"7f2eb370-5f1e-11f0-9885-ffbd6bb68f66","text":"90876","cards_platform":"Web-12","include_cards":1,"include_quote_count":true,"dm_users":false}'
#response = requests.post('https://x.com/i/api/1.1/dm/new2.json', params=params, cookies=cookies, headers=headers, data=data)

print(response.status_code)
print(response.text)