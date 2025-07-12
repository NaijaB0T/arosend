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
    '__cf_bm': 'jlnVLap_C_nUvUcrsSaFs6cMb3tbLSPphnZlw11fPJY-1752325321-1.0.1.1-0iTH6j4uDmoERvqHsPKeNnWQBNZ6OJvowWr3JK5GrEEYRQgdc4qsJLFiERTYfgzbg1kRlQ4odgra6u_.RTNqSGGp03vDBaZiyOX2.lR4BO4',
}

headers = {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.5',
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://x.com/itzbasito',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'x-client-transaction-id': 'OmxnMvlR/UnylLpNT1AuzTscK+t7qeqP77rhsw5qFCW1KTsdqo3LJwYP8WSFp/fcT23GGD5/VQocm1UArvTZTU42tlB2OQ',
    'x-csrf-token': 'a4a052b66c7f87161176633a00e2c4d80d33d02b96f435943280bddb2db3d947c77989a6b24a686f0b073eac92fc6018217a85c5e203b895c8179fd690920130038eebd0176e69f5711aa41b268acc52',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': 'en',
    'x-xp-forwarded-for': '3a4c36f9a1b7ab275c2fa775aaa74c036d6b57edd9803a8697fdc0701dd2fe5e83ed50147b87ca23c5b0e3c68b2d93fc146af7914d09b49124d0e578a15e7cc063bff1d8e946e12762ab4c077d9fc3563fcbb3c2e546451c43f65da2daafcafe2c1cbaaf72d0e27561240149cd122c850b4b0b8eced559a6dd41f13bdf63884b00cc43032accdd031c3143497292a7f3db24116ff5d1016ea8b70346c0ea1c37becad6f29c98b9dd11c87ce0b230954b1f60b684dc2dacf3cc8aeff932869e1978ec9fdd87785341cd8b94ac16405a1d84df8af54f3b64ce9bfc1067801793efac551ba2a09e63961fae7e02398cb6169629b85083a2825f6db53a',
    # 'cookie': 'kdt=gLTAld7RR9RWogkkj7ld6SIvyNbaLcL8gjHUIa6l; dnt=1; guest_id=v1%3A174808507908900969; guest_id_marketing=v1%3A174808507908900969; guest_id_ads=v1%3A174808507908900969; auth_token=74dc1345e2dad765e40c0e7c051185aa0f04b9ef; ct0=a4a052b66c7f87161176633a00e2c4d80d33d02b96f435943280bddb2db3d947c77989a6b24a686f0b073eac92fc6018217a85c5e203b895c8179fd690920130038eebd0176e69f5711aa41b268acc52; twid=u%3D1117329087092219911; personalization_id="v1_+9v1aEUBXG8886IpIR+G4Q=="; d_prefs=MjoxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw; lang=en; __cf_bm=jlnVLap_C_nUvUcrsSaFs6cMb3tbLSPphnZlw11fPJY-1752325321-1.0.1.1-0iTH6j4uDmoERvqHsPKeNnWQBNZ6OJvowWr3JK5GrEEYRQgdc4qsJLFiERTYfgzbg1kRlQ4odgra6u_.RTNqSGGp03vDBaZiyOX2.lR4BO4',
}

params = {
    'variables': '{"screen_name":"itsduch"}',
    'features': '{"responsive_web_grok_bio_auto_translation_is_enabled":false,"hidden_profile_subscriptions_enabled":true,"payments_enabled":false,"profile_label_improvements_pcf_label_in_post_enabled":true,"rweb_tipjar_consumption_enabled":true,"verified_phone_label_enabled":false,"subscriptions_verification_info_is_identity_verified_enabled":true,"subscriptions_verification_info_verified_since_enabled":true,"highlights_tweets_tab_ui_enabled":true,"responsive_web_twitter_article_notes_tab_enabled":true,"subscriptions_feature_can_gift_premium":true,"creator_subscriptions_tweet_preview_api_enabled":true,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"responsive_web_graphql_timeline_navigation_enabled":true}',
    'fieldToggles': '{"withAuxiliaryUserLabels":true}',
}

response = requests.get(
    'https://x.com/i/api/graphql/x3RLKWW1Tl7JgU7YtGxuzw/UserByScreenName',
    params=params,
    cookies=cookies,
    headers=headers,
)

print(response.text)