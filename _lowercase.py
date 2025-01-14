import os

def rename_png_to_lowercase(directory):
    # print(f'{directory}')
    try:
        for filename in os.listdir(directory):
            if filename.endswith('.webp'):
                # print(f'{filename}')
                old_path = os.path.join(directory, filename)
                new_filename = filename.lower()
                new_path = os.path.join(directory, new_filename)
                if old_path != new_path:
                    os.rename(old_path, new_path)
                    print(f'Renamed: {old_path} -> {new_path}')
                # else:
                    # print(f'File already lowercase: {old_path}')
    except Exception as e:
        print(f"Error: {e}")

directory_path = os.getcwd()

rename_png_to_lowercase(directory_path)
