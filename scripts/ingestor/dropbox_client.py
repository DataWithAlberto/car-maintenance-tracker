"""
Thin wrapper around the official Dropbox SDK.

Uses the long-lived refresh token flow (OAuth2) so the access token
se renueva automáticamente sin intervención manual.
"""
import io
import os
import dropbox
from dropbox.files import ListFolderResult


def get_client() -> dropbox.Dropbox:
    return dropbox.Dropbox(
        oauth2_refresh_token=os.environ["DROPBOX_REFRESH_TOKEN"],
        app_key=os.environ["DROPBOX_APP_KEY"],
        app_secret=os.environ["DROPBOX_APP_SECRET"],
    )


def list_new_files(cursor: str | None, folder: str) -> tuple[list[str], str]:
    """
    Devuelve (rutas_csv_nuevas, nuevo_cursor).

    Si cursor es None hace un listing inicial completo; en llamadas
    sucesivas solo retorna los cambios desde la última vez.
    """
    dbx = get_client()

    if cursor is None:
        result: ListFolderResult = dbx.files_list_folder(folder, recursive=False)
    else:
        result = dbx.files_list_folder_continue(cursor)

    new_csvs: list[str] = []

    while True:
        for entry in result.entries:
            if (
                isinstance(entry, dropbox.files.FileMetadata)
                and entry.name.lower().endswith(".csv")
            ):
                new_csvs.append(entry.path_lower)

        if not result.has_more:
            break
        result = dbx.files_list_folder_continue(result.cursor)

    return new_csvs, result.cursor


def download_csv(path: str) -> io.StringIO:
    """Descarga un CSV en memoria y lo devuelve como StringIO."""
    dbx = get_client()
    _, response = dbx.files_download(path)
    content = response.content.decode("utf-8-sig")   # utf-8-sig elimina BOM si lo hay
    return io.StringIO(content)
