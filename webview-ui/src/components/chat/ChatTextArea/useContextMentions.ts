import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react'; // Added useMemo
import {
  ContextMenuOptionType,
  getContextMenuOptions,
  insertMention,
  removeMention,
  shouldShowContextMenu,
  ContextMenuQueryItem,
} from '../../../utils/context-mentions'; // Added ContextMenuQueryItem
import { mentionRegex } from '../../../../../src/shared/context-mentions';
import { useEvent } from 'react-use';
import { vscode } from '../../../utils/vscode';
import { ExtensionMessage } from '../../../../../src/shared/ExtensionMessage';
import { GitCommit } from '../../../../../src/utils/git'; // correct relative to src ?

// Define props/dependencies for the hook
interface UseContextMentionsProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | null>;
  filePaths: string[]; // Accept filePaths directly
}

// Define return type for the hook
interface UseContextMentionsReturn {
  showContextMenu: boolean;
  searchQuery: string;
  selectedMenuIndex: number;
  selectedType: ContextMenuOptionType | null;
  contextMenuContainerRef: React.RefObject<HTMLDivElement>;
  handleKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleBlur: () => void;
  handlePaste: (e: React.ClipboardEvent) => Promise<void>;
  handleKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleMenuMouseDown: () => void;
  onMentionSelect: (type: ContextMenuOptionType, value?: string) => void;
  contextMenuOptions: ContextMenuQueryItem[]; // Return calculated options
}

export const useContextMentions = ({
  inputValue,
  setInputValue,
  textAreaRef,
  filePaths, // Use filePaths from props
}: UseContextMentionsProps): UseContextMentionsReturn => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMouseDownOnMenu, setIsMouseDownOnMenu] = useState(false);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(-1);
  const [selectedType, setSelectedType] =
    useState<ContextMenuOptionType | null>(null);
  const [justDeletedSpaceAfterMention, setJustDeletedSpaceAfterMention] =
    useState(false);
  const [intendedCursorPosition, setIntendedCursorPosition] = useState<
    number | null
  >(null);
  const contextMenuContainerRef = useRef<HTMLDivElement>(null);
  const [gitCommits, setGitCommits] = useState<any[]>([]); // Keep internal state for fetched commits

  // --- Calculate queryItems internally ---
  const queryItems = useMemo(() => {
    return [
      { type: ContextMenuOptionType.Problems, value: 'problems' },
      { type: ContextMenuOptionType.Terminal, value: 'terminal' },
      ...gitCommits, // Use internal gitCommits state
      ...filePaths // Use filePaths from props
        .map((file) => '/' + file)
        .map((path) => ({
          type: path.endsWith('/')
            ? ContextMenuOptionType.Folder
            : ContextMenuOptionType.File,
          value: path,
        })),
    ];
  }, [filePaths, gitCommits]);

  // --- Calculate contextMenuOptions internally ---
  const contextMenuOptions = useMemo(() => {
    return getContextMenuOptions(searchQuery, selectedType, queryItems);
  }, [searchQuery, selectedType, queryItems]);

  // --- Effects ---
  useEffect(() => {
    if (
      selectedType === ContextMenuOptionType.Git ||
      /^[a-f0-9]+$/i.test(searchQuery)
    ) {
      vscode.postMessage({
        type: 'searchCommits',
        text: searchQuery || '',
      });
    }
  }, [selectedType, searchQuery]);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message: ExtensionMessage = event.data;
    switch (message.type) {
      case 'commitSearchResults': {
        const commits =
          message.commits?.map((commit: any) => ({
            type: ContextMenuOptionType.Git,
            value: commit.hash,
            label: commit.subject,
            description: `${commit.shortHash} by ${commit.author} on ${commit.date}`,
          })) || [];
        setGitCommits(commits); // Update internal state
        break;
      }
    }
  }, []);

  useEvent('message', handleMessage);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuContainerRef.current &&
        !contextMenuContainerRef.current.contains(event.target as Node)
      ) {
        setShowContextMenu(false);
      }
    };
    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContextMenu]);

  useEffect(() => {
    if (!showContextMenu) {
      setSelectedType(null);
    }
  }, [showContextMenu]);

  useLayoutEffect(() => {
    if (intendedCursorPosition !== null && textAreaRef.current) {
      textAreaRef.current.setSelectionRange(
        intendedCursorPosition,
        intendedCursorPosition
      );
      setIntendedCursorPosition(null);
    }
  }, [inputValue, intendedCursorPosition, textAreaRef]);

  // --- Handlers ---
  const updateCursorPosition = useCallback(() => {
    if (textAreaRef.current) {
      setCursorPosition(textAreaRef.current.selectionStart);
    }
  }, [textAreaRef]);

  const onMentionSelect = useCallback(
    (type: ContextMenuOptionType, value?: string) => {
      if (type === ContextMenuOptionType.NoResults) {
        return;
      }

      if (
        type === ContextMenuOptionType.File ||
        type === ContextMenuOptionType.Folder ||
        type === ContextMenuOptionType.Git
      ) {
        if (!value) {
          setSelectedType(type);
          setSearchQuery('');
          setSelectedMenuIndex(0);
          return;
        }
      }

      setShowContextMenu(false);
      setSelectedType(null);
      if (textAreaRef.current) {
        let insertValue = value || '';
        if (type === ContextMenuOptionType.URL) {
          insertValue = value || '';
        } else if (
          type === ContextMenuOptionType.File ||
          type === ContextMenuOptionType.Folder
        ) {
          insertValue = value || '';
        } else if (type === ContextMenuOptionType.Problems) {
          insertValue = 'problems';
        } else if (type === ContextMenuOptionType.Terminal) {
          insertValue = 'terminal';
        } else if (type === ContextMenuOptionType.Git) {
          insertValue = value || '';
        }

        const { newValue, mentionIndex } = insertMention(
          textAreaRef.current.value,
          cursorPosition,
          insertValue
        );

        setInputValue(newValue);
        const newCursorPosition = mentionIndex + insertValue.length + 1;
        setCursorPosition(newCursorPosition);
        setIntendedCursorPosition(newCursorPosition);

        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.blur();
            textAreaRef.current.focus();
            textAreaRef.current.setSelectionRange(
              newCursorPosition,
              newCursorPosition
            );
          }
        }, 0);
      }
    },
    [setInputValue, cursorPosition, textAreaRef]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (showContextMenu) {
        if (event.key === 'Escape') {
          setSelectedType(null);
          if (selectedType) {
            setSelectedMenuIndex(3);
          } else {
            setShowContextMenu(false);
          }
          return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedMenuIndex((prevIndex) => {
            const direction = event.key === 'ArrowUp' ? -1 : 1;
            const options = contextMenuOptions; // Use calculated options
            const optionsLength = options.length;
            if (optionsLength === 0) {
              return prevIndex;
            }

            const selectableOptions = options.filter(
              (option) =>
                option.type !== ContextMenuOptionType.URL &&
                option.type !== ContextMenuOptionType.NoResults
            );
            if (selectableOptions.length === 0) {
              return -1;
            }

            const currentSelectableIndex = selectableOptions.findIndex(
              (option) => option === options[prevIndex]
            );
            const newSelectableIndex =
              (currentSelectableIndex + direction + selectableOptions.length) %
              selectableOptions.length;
            return options.findIndex(
              (option) => option === selectableOptions[newSelectableIndex]
            );
          });
          return;
        }

        if (
          (event.key === 'Enter' || event.key === 'Tab') &&
          selectedMenuIndex !== -1
        ) {
          event.preventDefault();
          const options = contextMenuOptions; // Use calculated options
          const selectedOption = options[selectedMenuIndex];
          if (
            selectedOption &&
            selectedOption.type !== ContextMenuOptionType.URL &&
            selectedOption.type !== ContextMenuOptionType.NoResults
          ) {
            onMentionSelect(selectedOption.type, selectedOption.value);
          } // Added closing brace
          return;
        }
      }

      const isComposing = event.nativeEvent?.isComposing ?? false;
      if (event.key === 'Backspace' && !isComposing) {
        const charBeforeCursor = inputValue[cursorPosition - 1];
        const charAfterCursor = inputValue[cursorPosition + 1];
        const charBeforeIsWhitespace =
          charBeforeCursor === ' ' ||
          charBeforeCursor === '\n' ||
          charBeforeCursor === '\r\n';
        const charAfterIsWhitespace =
          charAfterCursor === ' ' ||
          charAfterCursor === '\n' ||
          charAfterCursor === '\r\n';

        if (
          charBeforeIsWhitespace &&
          inputValue
            .slice(0, cursorPosition - 1)
            .match(new RegExp(mentionRegex.source + '$'))
        ) {
          const newCursorPosition = cursorPosition - 1;
          if (!charAfterIsWhitespace) {
            event.preventDefault();
            textAreaRef.current?.setSelectionRange(
              newCursorPosition,
              newCursorPosition
            );
            setCursorPosition(newCursorPosition); // Added closing brace
          }
          setCursorPosition(newCursorPosition);
          setJustDeletedSpaceAfterMention(true);
        } else if (justDeletedSpaceAfterMention) {
          const { newText, newPosition } = removeMention(
            inputValue,
            cursorPosition
          );
          if (newText !== inputValue) {
            event.preventDefault();
            setInputValue(newText);
            setIntendedCursorPosition(newPosition); // Added closing brace
          }
          setJustDeletedSpaceAfterMention(false);
          setShowContextMenu(false);
        } else {
          setJustDeletedSpaceAfterMention(false);
        }
      }
    },
    [
      showContextMenu,
      searchQuery,
      selectedMenuIndex,
      onMentionSelect,
      selectedType,
      inputValue,
      cursorPosition,
      setInputValue,
      justDeletedSpaceAfterMention,
      contextMenuOptions,
      textAreaRef, // Use contextMenuOptions
    ]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const newCursorPosition = e.target.selectionStart;
      setInputValue(newValue);
      setCursorPosition(newCursorPosition);
      const showMenu = shouldShowContextMenu(newValue, newCursorPosition);

      setShowContextMenu(showMenu);
      if (showMenu) {
        const lastAtIndex = newValue.lastIndexOf('@', newCursorPosition - 1);
        const query = newValue.slice(lastAtIndex + 1, newCursorPosition);
        setSearchQuery(query);
        setSelectedMenuIndex(query.length > 0 ? 0 : 3);
      } else {
        setSearchQuery('');
        setSelectedMenuIndex(-1);
        setSelectedType(null);
      }
    },
    [setInputValue]
  );

  const handleBlur = useCallback(() => {
    if (!isMouseDownOnMenu) {
      setShowContextMenu(false);
    }
  }, [isMouseDownOnMenu]);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const pastedText = e.clipboardData.getData('text');
      const urlRegex = /^\S+:\/\/\S+$/;
      if (urlRegex.test(pastedText.trim())) {
        e.preventDefault();
        const trimmedUrl = pastedText.trim();
        const currentVal = textAreaRef.current?.value ?? inputValue;
        const currentPos =
          textAreaRef.current?.selectionStart ?? cursorPosition;
        const newValue =
          currentVal.slice(0, currentPos) +
          trimmedUrl +
          ' ' +
          currentVal.slice(currentPos);
        setInputValue(newValue);
        const newCursorPosition = currentPos + trimmedUrl.length + 1;
        setCursorPosition(newCursorPosition);
        setIntendedCursorPosition(newCursorPosition);
        setShowContextMenu(false);

        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.blur();
            textAreaRef.current.focus();
            textAreaRef.current.setSelectionRange(
              newCursorPosition,
              newCursorPosition
            );
          }
        }, 0);
      }
    },
    [cursorPosition, setInputValue, inputValue, textAreaRef]
  );

  const handleMenuMouseDown = useCallback(() => {
    setIsMouseDownOnMenu(true);
    setTimeout(() => setIsMouseDownOnMenu(false), 100);
  }, []);

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Home',
          'End',
        ].includes(e.key)
      ) {
        updateCursorPosition();
      } // Added closing brace
    },
    [updateCursorPosition]
  );

  return {
    showContextMenu,
    searchQuery,
    selectedMenuIndex,
    selectedType,
    contextMenuContainerRef,
    handleKeyDown,
    handleInputChange,
    handleBlur,
    handlePaste,
    handleKeyUp,
    handleMenuMouseDown,
    onMentionSelect,
    contextMenuOptions, // Return calculated options
  };
};
