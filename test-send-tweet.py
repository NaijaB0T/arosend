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
    '__cf_bm': '.AQEfzALOPsyvSftGpj_cxcQpAet5b.3PVxkrOELKic-1752326239-1.0.1.1-6PWseoaRcxvHjGcBSY44J6iafe2Jo1xdMyLCIMzGQA1Vx2UVcR0hUs97p9jtDAj1ulpy9jtW1W35wOTDoN8I0coMXOp36lrSTKRHNOhpKsE',
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
    'referer': 'https://x.com/compose/post',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'x-client-transaction-id': 'LdZlNaWnzgQO/gUGa9/k1sap7TvnWm6CGsopiFqsxsDe8BUzKZPj42YFCgS5mzTGBGjSDykqSwccalwO+hB2/gjcG8G3Lg',
    'x-csrf-token': 'a4a052b66c7f87161176633a00e2c4d80d33d02b96f435943280bddb2db3d947c77989a6b24a686f0b073eac92fc6018217a85c5e203b895c8179fd690920130038eebd0176e69f5711aa41b268acc52',
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': 'en',
    'x-xp-forwarded-for': '793f0388c521d9cbd84246d976291c4d38091edb3c27fb541d7c6b1f144e31f6d450daf4a11f98f6910b591970859786001c26c6d8635511cd1dae0fe695b6e765d8803c7bf81d427b2e0379e87f41bd760afd88d95aabd6290e44e63c99fb47139092daabc04ec89743ccf495ff5eb99eaf55cb0057368078ff8fb87b5cf133387cf3a4fce490877e076b434da51d7f87f56af993b362a2dcef01b6abe8aa49f64b3e40740ef0f82a64a919f0f14ec17426469e0b80b56a3bfb4d898c343e0f2841a5735fc528706760548a54b33da92a15fec0dee45307f5a28cc1686bcdf8deea9a88c7fa90b9a2ce3e94cab864f2acd2c88ecd22a3a0d15069',
    # 'cookie': 'kdt=gLTAld7RR9RWogkkj7ld6SIvyNbaLcL8gjHUIa6l; dnt=1; guest_id=v1%3A174808507908900969; guest_id_marketing=v1%3A174808507908900969; guest_id_ads=v1%3A174808507908900969; auth_token=74dc1345e2dad765e40c0e7c051185aa0f04b9ef; ct0=a4a052b66c7f87161176633a00e2c4d80d33d02b96f435943280bddb2db3d947c77989a6b24a686f0b073eac92fc6018217a85c5e203b895c8179fd690920130038eebd0176e69f5711aa41b268acc52; twid=u%3D1117329087092219911; personalization_id="v1_+9v1aEUBXG8886IpIR+G4Q=="; d_prefs=MjoxLGNvbnNlbnRfdmVyc2lvbjoyLHRleHRfdmVyc2lvbjoxMDAw; lang=en; __cf_bm=.AQEfzALOPsyvSftGpj_cxcQpAet5b.3PVxkrOELKic-1752326239-1.0.1.1-6PWseoaRcxvHjGcBSY44J6iafe2Jo1xdMyLCIMzGQA1Vx2UVcR0hUs97p9jtDAj1ulpy9jtW1W35wOTDoN8I0coMXOp36lrSTKRHNOhpKsE',
}

json_data = {
    'variables': {
        'tweet_text': '91826',
        'reply': {
            'in_reply_to_tweet_id': '1931806536667709834',
            'exclude_reply_user_ids': [],
        },
        'dark_request': False,
        'media': {
            'media_entities': [],
            'possibly_sensitive': False,
        },
        'semantic_annotation_ids': [],
        'disallowed_reply_options': None,
    },
    'features': {
        'premium_content_api_read_enabled': False,
        'communities_web_enable_tweet_community_results_fetch': True,
        'c9s_tweet_anatomy_moderator_badge_enabled': True,
        'responsive_web_grok_analyze_button_fetch_trends_enabled': False,
        'responsive_web_grok_analyze_post_followups_enabled': True,
        'responsive_web_jetfuel_frame': True,
        'responsive_web_grok_share_attachment_enabled': True,
        'responsive_web_edit_tweet_api_enabled': True,
        'graphql_is_translatable_rweb_tweet_is_translatable_enabled': True,
        'view_counts_everywhere_api_enabled': True,
        'longform_notetweets_consumption_enabled': True,
        'responsive_web_twitter_article_tweet_consumption_enabled': True,
        'tweet_awards_web_tipping_enabled': False,
        'responsive_web_grok_show_grok_translated_post': False,
        'responsive_web_grok_analysis_button_from_backend': True,
        'creator_subscriptions_quote_tweet_preview_enabled': False,
        'longform_notetweets_rich_text_read_enabled': True,
        'longform_notetweets_inline_media_enabled': True,
        'payments_enabled': False,
        'profile_label_improvements_pcf_label_in_post_enabled': True,
        'rweb_tipjar_consumption_enabled': True,
        'verified_phone_label_enabled': False,
        'articles_preview_enabled': True,
        'responsive_web_grok_community_note_auto_translation_is_enabled': False,
        'responsive_web_graphql_skip_user_profile_image_extensions_enabled': False,
        'freedom_of_speech_not_reach_fetch_enabled': True,
        'standardized_nudges_misinfo': True,
        'tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled': True,
        'responsive_web_grok_image_annotation_enabled': True,
        'responsive_web_graphql_timeline_navigation_enabled': True,
        'responsive_web_enhance_cards_enabled': False,
    },
    'queryId': 'NFLiwu9YyFJTAeqo69D-eA',
}

response = requests.post(
    'https://x.com/i/api/graphql/NFLiwu9YyFJTAeqo69D-eA/CreateTweet',
    cookies=cookies,
    headers=headers,
    json=json_data,
)

# Note: json_data will not be serialized by requests
# exactly as it was in the original request.
#data = '{"variables":{"tweet_text":"90826","reply":{"in_reply_to_tweet_id":"1931806536667709834","exclude_reply_user_ids":[]},"dark_request":false,"media":{"media_entities":[],"possibly_sensitive":false},"semantic_annotation_ids":[],"disallowed_reply_options":null},"features":{"premium_content_api_read_enabled":false,"communities_web_enable_tweet_community_results_fetch":true,"c9s_tweet_anatomy_moderator_badge_enabled":true,"responsive_web_grok_analyze_button_fetch_trends_enabled":false,"responsive_web_grok_analyze_post_followups_enabled":true,"responsive_web_jetfuel_frame":true,"responsive_web_grok_share_attachment_enabled":true,"responsive_web_edit_tweet_api_enabled":true,"graphql_is_translatable_rweb_tweet_is_translatable_enabled":true,"view_counts_everywhere_api_enabled":true,"longform_notetweets_consumption_enabled":true,"responsive_web_twitter_article_tweet_consumption_enabled":true,"tweet_awards_web_tipping_enabled":false,"responsive_web_grok_show_grok_translated_post":false,"responsive_web_grok_analysis_button_from_backend":true,"creator_subscriptions_quote_tweet_preview_enabled":false,"longform_notetweets_rich_text_read_enabled":true,"longform_notetweets_inline_media_enabled":true,"payments_enabled":false,"profile_label_improvements_pcf_label_in_post_enabled":true,"rweb_tipjar_consumption_enabled":true,"verified_phone_label_enabled":false,"articles_preview_enabled":true,"responsive_web_grok_community_note_auto_translation_is_enabled":false,"responsive_web_graphql_skip_user_profile_image_extensions_enabled":false,"freedom_of_speech_not_reach_fetch_enabled":true,"standardized_nudges_misinfo":true,"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled":true,"responsive_web_grok_image_annotation_enabled":true,"responsive_web_graphql_timeline_navigation_enabled":true,"responsive_web_enhance_cards_enabled":false},"queryId":"NFLiwu9YyFJTAeqo69D-eA"}'
#response = requests.post(
#    'https://x.com/i/api/graphql/NFLiwu9YyFJTAeqo69D-eA/CreateTweet',
#    cookies=cookies,
#    headers=headers,
#    data=data,
#)

print(response.text)