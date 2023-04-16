from alphabet import ALPHABET, ENGLISH_ALPHABET_FREQUENCY, PORTUGUESE_ALPHABET_FREQUENCY

ALPHABET_SIZE = len(ALPHABET)

alphabet_frequency_map = {
    'English': ENGLISH_ALPHABET_FREQUENCY,
    'Portuguese': PORTUGUESE_ALPHABET_FREQUENCY
}


def decrypt_vigenere(selectedCypher, maxKeyLength, selected_language):
    print(f"\n> Ciphered text length: {len(selectedCypher)} characters")
    # Distribute the ciphered text into subarrays, each one with a length equal to its key length
    subarrays = distribute_cypher_by_key_length(selectedCypher, maxKeyLength)
    print(f"> Created {len(subarrays)} key attemps")

    # Calculate the IoC for each subarray
    ioc_array, frequencies_array = calculate_ioc_by_subarray(subarrays)

    # Find the key length with the highest IoC
    key_length = find_key_length_by_ioc(ioc_array)
    print(f"> Key length with highest IoC: {key_length}")

    subtexts = subarrays[key_length - 1]
    frequencies = frequencies_array[key_length - 1]

    key = ''
    clear_text = ''
    key_accepted = False
    while not key_accepted:
        shifts = find_shifts(subtexts, frequencies, selected_language)

        # Create the key
        key = create_key(shifts)

        print(f"> Key: {key}")

        # Decipher each subarray
        clear_arrays = decipher_subtexts(subtexts, shifts)

        # Join the subarrays into a single array
        clear_text = join_subarrays(clear_arrays)

        print(f"> Clear text: {clear_text[:100]}")

        key_accepted = input("Is the key correct? (y/n): ") == "y"
        if key_accepted:
            print("Key accepted!")
        else:
            print("Key rejected!")
    return (key, clear_text)


def distribute_cypher_by_key_length(selectedCypher, key_length):
    sub_array = []
    # Create an array of arrays, each one with a length equal to its key length
    for i in range(1, key_length + 1):
        sub_array.append(
            list(
                map(lambda x: [], range(i))
            )
        )

    # Distribute the letters of the ciphered text into the subarrays
    for i in range(len(selectedCypher)):
        for j in range(key_length):
            position = i % (j + 1)
            sub_array[j][position].append(selectedCypher[i])

    return sub_array


def calculate_ioc_by_subarray(keyArray):
    ioc_array = [[] for _ in range(len(keyArray))]
    frequencies_array = [[] for _ in range(len(keyArray))]
    for i in range(len(keyArray)):
        subtexts = keyArray[i]
        for j in range(len(subtexts)):
            subtext = subtexts[j]
            ioc, frequencies = calculate_ioc(subtext)
            ioc_array[i].append(ioc)
            frequencies_array[i].append(frequencies)
    return [ioc_array, frequencies_array]


def calculate_ioc(text):
    frequencies = [0] * ALPHABET_SIZE
    total_chars = len(text)
    # Count the frequency of each letter in the text
    for i in range(total_chars):
        char_code = ord(text[i])
        if 65 <= char_code <= 90:
            # uppercase letters
            frequencies[char_code - 65] += 1
        elif 97 <= char_code <= 122:
            # lowercase letters
            frequencies[char_code - 97] += 1

    # Calculate the IC
    sum = 0
    for i in range(ALPHABET_SIZE):
        sum += frequencies[i] * frequencies[i]
    ic = sum / (total_chars * (total_chars - 1))
    return [ic, frequencies]

# Returns the key length with the highest IoC


def find_key_length_by_ioc(ioc_array):
    max_ioc = 0
    key_length = 0
    for i in range(len(ioc_array)):
        max_block_ioc = max(ioc_array[i])
        if max_block_ioc > max_ioc:
            max_ioc = max_block_ioc
            key_length = i + 1
    return key_length


def find_highest(array, max_nums=3):
    top_highest = []
    aux_array = array.copy()
    for i in range(max_nums):
        max_value = max(aux_array)
        index = aux_array.index(max_value)
        letter = ALPHABET[index]
        char_code = ord(letter)
        top_highest.append(
            {'letter': letter, 'char_code': char_code, 'index': index, 'value': max_value})
        aux_array.pop(index)
    return top_highest


def calculate_shift(char_code_1, char_code_2):
    shift = (char_code_1 - char_code_2) % ALPHABET_SIZE
    return shift


def create_key(shifts):
    return "".join([ALPHABET[shift] for shift in shifts])


def find_shifts(subtexts, frequencies, selected_language):
    alphabet_frequency = alphabet_frequency_map[selected_language]
    key_length = len(subtexts)
    top = 3
    shifts = []

    # Find the most frequent letters in the alphabet of the selected language
    most_frequent_letter_from_alphabet = find_highest(
        list(alphabet_frequency.values()), 1)[0]
    print(
        f'> Most frequent letter in the {selected_language} alphabet: {most_frequent_letter_from_alphabet["letter"]} ({most_frequent_letter_from_alphabet["value"]})')

    # Find the most frequent letters in each block of the subtext
    most_frequent_letters_from_subtext = []
    for i in range(key_length):
        most_frequent_letters_from_block = find_highest(frequencies[i], top)
        most_frequent_letters_from_subtext.append(
            most_frequent_letters_from_block)

    # Find the possible shifts for each block
    possible_shifts = [[] for _ in range(top)]
    for frequent_letters_from_block in most_frequent_letters_from_subtext:
        for i in range(top):
            char_code = frequent_letters_from_block[i]['char_code']
            shift = calculate_shift(
                char_code, most_frequent_letter_from_alphabet['char_code'])
            possible_shifts[i].append(shift)

    # Print the possible shifts
    print('\n> Possible keys ordered by frequency:')
    for shift_block in possible_shifts:
        [print("".join(ALPHABET[shift] for shift in shift_block))]

    # Create the key by selecting the most probable shift for each block
    for i in range(key_length):
        possible_shifts_by_key = [shifts[i] for shifts in possible_shifts]
        print(f'\nSelect a key for block {i+1}: ')
        shift = select_shift(possible_shifts_by_key)
        shifts.append(shift)
    return shifts


def select_shift(shifts):
    for index, shift in enumerate(shifts):
        print(f'{index + 1}. {ALPHABET[shift]}')
    while True:
        shift = input(
            f'Select a letter (1-{len(shifts)}): ')
        try:
            shift = int(shift)
            if shift < 1 or shift > len(shifts):
                raise ValueError
            break
        except (ValueError):
            print('Invalid input')
    return shifts[shift - 1]


def decipher_subtexts(subtexts, shifts):
    clear_arrays = []

    for i in range(len(subtexts)):
        subtext = subtexts[i]
        shift = shifts[i]
        clear_text = decipher_block(subtext, shift)
        clear_arrays.append(clear_text)
    return clear_arrays


def decipher_block(text, shift):
    clear_text = []
    for i in range(len(text)):
        char_code = ord(text[i])
        if char_code >= 65 and char_code <= 90:
            # uppercase letters
            clear_text.append(
                chr(((char_code - 65 - shift + ALPHABET_SIZE) % ALPHABET_SIZE) + 65)
            )
        elif char_code >= 97 and char_code <= 122:
            # lowercase letters
            clear_text.append(
                chr(((char_code - 97 - shift + ALPHABET_SIZE) % ALPHABET_SIZE) + 97)
            )
        else:
            clear_text.append(text[i])
    return clear_text


def join_subarrays(subarrays):
    # Get the maximum length of the subarrays
    max_length = max([len(arr) for arr in subarrays])
    clear_text = []

    for i in range(max_length):
        for j in range(len(subarrays)):
            if i < len(subarrays[j]):
                clear_text += subarrays[j][i]
    return "".join(clear_text)
