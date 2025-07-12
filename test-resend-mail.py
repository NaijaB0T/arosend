import os
import resend

# It's recommended to set your API key as an environment variable
# to avoid exposing it in your code.
# You can get your key from https://resend.com/api-keys
#
# For this example, we are using the key you provided.
# In a production environment, use the commented line below instead.
# resend.api_key = os.environ["RESEND_API_KEY"]
resend.api_key = "re_TCScdzqZ_B65rfNYd68eUDmb4QzcameCe"

# Define the email parameters.
# The 'from' address must be a domain you have verified in your Resend account. [1]
# For testing, Resend allows using 'onboarding@resend.dev'.
params = {
    "from": "Aroko <onboarding@aroko.femitaofeeq.com>",
    "to": ["olutao@yahoo.com"],  # Replace with the recipient's email address.
    "subject": "Hello from Aroko, verify your mail!",
    "html": "<strong>This is a test email sent using the Resend API and Python.</strong>",
}

try:
    # Send the email.
    email = resend.Emails.send(params)
    print("Email sent successfully!")
    print(f"Email ID: {email['id']}")
except Exception as e:
    print(f"An error occurred: {e}")