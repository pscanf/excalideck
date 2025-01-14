import {
    fileOpen,
    fileSave,
    FileSystemHandle,
} from "@dwelle/browser-fs-access";
import { Deck } from "@excalideck/deck";
import { FileSavingState } from "@excalideck/excalideck-editor";
import ExcalideckFile from "@excalideck/excalideck-file";
import { useCallback, useState } from "react";
import LocalDeck from "../LocalDeck";
import isAbortError from "../utils/isAbortError";

interface PersistentExcalideckEditorState {
    fileSavingState: FileSavingState;
    openFileHandle: FileSystemHandle | null;
    deck: Deck;
}

export default function usePersistentExcalideckEditorState(
    initialDeck: Deck,
    saveToLocalStorage: boolean
) {
    const [
        persistentExcalideckEditorState,
        setPersistentExcalideckEditorState,
    ] = useState<PersistentExcalideckEditorState>({
        fileSavingState: null,
        openFileHandle: null,
        deck: saveToLocalStorage ? LocalDeck.get() ?? initialDeck : initialDeck,
    });

    async function loadFromFile() {
        try {
            const file = await fileOpen({
                extensions: [ExcalideckFile.extension],
                description: "Load from Excalideck file",
                id: "Excalideck",
            });
            const deck = await ExcalideckFile.getDeckFromFile(file);

            setPersistentExcalideckEditorState({
                deck: deck,
                openFileHandle: file.handle ?? null,
                fileSavingState: {
                    fileName: file.name,
                    isSavingInProgress: false,
                    areAllChangesSaved: true,
                },
            });
        } catch (error) {
            if (!isAbortError(error)) {
                console.error(error);
                window.alert("Loading from Excalideck file failed");
            }
        }
    }

    async function saveToFile() {
        try {
            setPersistentExcalideckEditorState({
                ...persistentExcalideckEditorState,
                fileSavingState: persistentExcalideckEditorState.fileSavingState
                    ? {
                          ...persistentExcalideckEditorState.fileSavingState,
                          isSavingInProgress: true,
                      }
                    : null,
            });

            const blob = await ExcalideckFile.getBlobFromDeck(
                persistentExcalideckEditorState.deck
            );
            const fileHandle = await fileSave(
                blob,
                {
                    fileName: "deck",
                    mimeTypes: [ExcalideckFile.mimeType],
                    description: "Save to Excalideck file",
                    id: "Excalideck",
                    extensions: [ExcalideckFile.extension],
                    excludeAcceptAllOption: true,
                },
                persistentExcalideckEditorState.openFileHandle ?? null
            );

            setPersistentExcalideckEditorState(
                (latestPersistentExcalideckEditorState) => ({
                    ...latestPersistentExcalideckEditorState,
                    openFileHandle: fileHandle,
                    fileSavingState: {
                        fileName: fileHandle!.name,
                        isSavingInProgress: false,
                        areAllChangesSaved:
                            latestPersistentExcalideckEditorState.deck ===
                            persistentExcalideckEditorState.deck,
                    },
                })
            );
        } catch (error) {
            if (!isAbortError(error)) {
                console.error(error);
                window.alert("Saving to Excalideck file failed");
            }
        }
    }

    const updateDeck = useCallback(
        (deck: Deck) => {
            if (saveToLocalStorage) {
                LocalDeck.set(deck);
            }
            setPersistentExcalideckEditorState(
                (latestPersistentExcalideckEditorState) => ({
                    ...latestPersistentExcalideckEditorState,
                    deck: deck,
                    fileSavingState:
                        latestPersistentExcalideckEditorState.fileSavingState
                            ? {
                                  ...latestPersistentExcalideckEditorState.fileSavingState,
                                  areAllChangesSaved: false,
                              }
                            : null,
                })
            );
        },
        [saveToLocalStorage]
    );

    return {
        deck: persistentExcalideckEditorState.deck,
        fileSavingState: persistentExcalideckEditorState.fileSavingState,
        loadFromFile,
        saveToFile,
        updateDeck,
    };
}
