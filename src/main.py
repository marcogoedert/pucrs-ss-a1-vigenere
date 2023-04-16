import os
import datetime

from vigenere import decrypt_vigenere
cypher_dir = "./src/cyphers/"
output_dir = "./src/clear/"


def show_menu():
    # Get a list of files in the cypher directory
    try:
        files = os.listdir(cypher_dir)
    except OSError as e:
        print("Error reading cypher directory:", e)
        return

    print('Select a file to decipher (or enter "0" to exit):')
    for index, file in enumerate(files):
        print(f"{index + 1}. {file}")

    file_num = input("Enter the number of the file: ")
    if file_num == "0":
        return

    selected_file = files[int(file_num) - 1]
    print(f"> Selected language: {selected_file}")
    lang_num = input("Select a language (1 for Portuguese, 2 for English): ")
    if lang_num == "0":
        return

    selected_language = "Portuguese" if lang_num == "1" else "English"
    print(f"> Selected language: {selected_language}")

    max_length = input('Enter the maximum key length (or enter "0" to exit): ')
    if max_length == "0":
        return

    max_key_length = int(max_length)
    print(f"> Selected max key length: {max_key_length}")
    confirm_decipher = input(
        'Enter "d" to start deciphering, or any other key to return to the main menu: '
    )
    if confirm_decipher == "d":
        # Do something with the selected file, language, and max key length
        with open(os.path.join(cypher_dir, selected_file), "r") as f:
            cypher_text = f.read()
            # key, clear_text = decrypt_vigenere(
            key, clear_text = decrypt_vigenere(
                cypher_text, max_key_length, selected_language
            )
        # Export the clear text to a file
        timestamp = str(datetime.datetime.now()).replace(":", "-")
        selected_file_name = selected_file.split(".")[0]
        file_name = f"{timestamp}_{selected_file_name}.txt"
        # Create the output directory if it doesn't exist
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        # Write the output string to the file
        with open(os.path.join(output_dir, file_name), "w") as f:
            f.write(clear_text)
        print(
            f"Clear text file written to {os.path.join(output_dir, file_name)}")
        show_menu()
    else:
        # Return to the main menu
        show_menu()


show_menu()
