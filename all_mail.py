import requests
import json

def get_all_sent_emails(api_key):
    """
    Fetches all sent emails from the Resend API.

    Args:
        api_key: Your Resend API key.

    Returns:
        A list of dictionaries, where each dictionary represents a sent email.
    """
    emails = []
    # According to Resend's documentation, listing emails is not paginated.
    # We will make a single request to get the list of emails.
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    
    # This is the correct API endpoint for Resend
    api_url = "https://api.resend.com/emails"
    
    try:
        response = requests.get(api_url, headers=headers)

        # Raise an exception if the request was unsuccessful (e.g., 4xx or 5xx errors)
        response.raise_for_status() 

        data = response.json()
        
        # Resend returns the list under the "data" key
        if data and data.get("data"):
            for email in data["data"]:
                # The 'to' field in Resend's response is a list of addresses
                to_addresses = ", ".join(email.get("to", [])) 
                emails.append({
                    "id": email.get("id"),
                    "to_address": to_addresses,
                    "subject": email.get("subject"),
                    "created_at": email.get("created_at") # Resend uses 'created_at'
                })
        else:
            print("No emails found or unexpected data format.")

    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error occurred: {http_err} - {response.text}")
    except requests.exceptions.RequestException as err:
        print(f"An error occurred: {err}")
        
    return emails

if __name__ == "__main__":
    # It is highly recommended to use environment variables for API keys
    # instead of hardcoding them in the script for security reasons.
    api_key = "re_TCScdzqZ_B65rfNYd68eUDmb4QzcameCe"
    
    sent_emails = get_all_sent_emails(api_key)
    
    if sent_emails:
        print(f"Found {len(sent_emails)} emails.")
        for email in sent_emails:
            print(f"ID: {email['id']}, To: {email['to_address']}, Subject: {email['subject']}, Sent At: {email['created_at']}")
    else:
        print("Could not retrieve any sent emails.")