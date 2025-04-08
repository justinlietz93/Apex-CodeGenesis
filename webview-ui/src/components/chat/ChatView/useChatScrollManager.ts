import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { VirtuosoHandle } from 'react-virtuoso';
import debounce from 'debounce';
import { useEvent } from 'react-use';
import { ApexMessage } from '../../../../../src/shared/ExtensionMessage'; // Added ApexMessage

// Define dependencies more specifically
interface ChatScrollManagerDependencies {
  groupedMessages: (ApexMessage | ApexMessage[])[]; // Use groupedMessages for dependency
  expandedRows: Record<number, boolean>;
  setExpandedRows: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export const useChatScrollManager = (dependencies: ChatScrollManagerDependencies) => {
  const { groupedMessages, expandedRows, setExpandedRows } = dependencies; // Destructure dependencies

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const disableAutoScrollRef = useRef(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // Logic and handlers will be moved here

  const scrollToBottomSmooth = useMemo(
    () =>
      debounce(
        () => {
          virtuosoRef.current?.scrollTo({
            top: Number.MAX_SAFE_INTEGER,
            behavior: "smooth",
          });
        },
        10,
        { immediate: true },
      ),
    [],
  );

  const scrollToBottomAuto = useCallback(() => {
    virtuosoRef.current?.scrollTo({
      top: Number.MAX_SAFE_INTEGER,
      behavior: "auto", // instant causes crash
    });
  }, []);

  const handleWheel = useCallback((event: Event) => {
    const wheelEvent = event as WheelEvent;
    if (wheelEvent.deltaY && wheelEvent.deltaY < 0) {
      if (scrollContainerRef.current?.contains(wheelEvent.target as Node)) {
        disableAutoScrollRef.current = true;
      }
    }
  }, []);
  useEvent("wheel", handleWheel, window, { passive: true });

  // scroll when user toggles certain rows
	const toggleRowExpansion = useCallback(
		(ts: number) => {
			const isCollapsing = expandedRows[ts] ?? false
			const lastGroup = groupedMessages.at(-1)
			const isLast = Array.isArray(lastGroup) ? lastGroup[0].ts === ts : lastGroup?.ts === ts
			const secondToLastGroup = groupedMessages.at(-2)
			const isSecondToLast = Array.isArray(secondToLastGroup)
				? secondToLastGroup[0].ts === ts
				: secondToLastGroup?.ts === ts

			const isLastCollapsedApiReq =
				isLast &&
				!Array.isArray(lastGroup) && // Make sure it's not a browser session group
				lastGroup?.say === "api_req_started" &&
				!expandedRows[lastGroup.ts]

			setExpandedRows((prev) => ({
				...prev,
				[ts]: !prev[ts],
			}))

			// disable auto scroll when user expands row
			if (!isCollapsing) {
				disableAutoScrollRef.current = true
			}

			if (isCollapsing && isAtBottom) {
				const timer = setTimeout(() => {
					scrollToBottomAuto()
				}, 0)
				return () => clearTimeout(timer)
			} else if (isLast || isSecondToLast) {
				if (isCollapsing) {
					if (isSecondToLast && !isLastCollapsedApiReq) {
						return
					}
					const timer = setTimeout(() => {
						scrollToBottomAuto()
					}, 0)
					return () => clearTimeout(timer)
				} else {
					const timer = setTimeout(() => {
						virtuosoRef.current?.scrollToIndex({
							index: groupedMessages.length - (isLast ? 1 : 2),
							align: "start",
						})
					}, 0)
					return () => clearTimeout(timer)
				}
			}
		},
		[groupedMessages, expandedRows, setExpandedRows, scrollToBottomAuto, isAtBottom], // Added setExpandedRows dependency
	)

  const handleRowHeightChange = useCallback(
		(isTaller: boolean) => {
			if (!disableAutoScrollRef.current) {
				if (isTaller) {
					scrollToBottomSmooth()
				} else {
					setTimeout(() => {
						scrollToBottomAuto()
					}, 0)
				}
			}
		},
		[scrollToBottomSmooth, scrollToBottomAuto],
	)

  // Effect for scrolling based on message count
  useEffect(() => {
		if (!disableAutoScrollRef.current) {
			setTimeout(() => {
				scrollToBottomSmooth()
			}, 50)
			// return () => clearTimeout(timer) // dont cleanup since if visibleMessages.length changes it cancels.
		}
	}, [groupedMessages.length, scrollToBottomSmooth])


  return {
    virtuosoRef,
    scrollContainerRef,
    disableAutoScrollRef,
    showScrollToBottom,
    isAtBottom,
    scrollToBottomSmooth,
    scrollToBottomAuto,
    handleWheel, // Expose if needed directly
    toggleRowExpansion, // Expose the handler
    handleRowHeightChange, // Expose the handler
    setIsAtBottom, // Expose setters
    setShowScrollToBottom,
  };
};
