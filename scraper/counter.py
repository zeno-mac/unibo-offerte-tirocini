import sys

class Counter(object):
    """Context manager that prints a self-overwriting "msg: 001/100"
    progress line to stdout. Use as `with Counter(msg, start, end) as step:`
    and call `step()` once per iteration; a trailing newline is printed on
    exit so later output starts on a clean line."""
    msg = ""
    current = 0
    length = 0
    end = 0

    def __init__(self, msg: str, start: int, end: int):
        """Input: msg (str) label printed before the counter, start (int)
        first value to display, end (int) last value (also used to
        zero-pad current_number() to a fixed width). Output: None."""
        self.msg = msg
        self.current = start
        self.end = end
        self.length = len(str(end))
        return

    def current_number(self) -> str:
        """Input: None. Output: str; self.current zero-padded to the width
        of self.end (e.g. "007" when end is 100)."""
        self.current
        return "0"*(self.length - len(str(self.current))) + str(self.current)

    def step(self):
        """Input: None. Output: int; the counter value before this call.
        Rewrites the progress line with the current count and advances it,
        unless self.current already exceeds self.end, in which case it is
        left unchanged and nothing is printed."""
        if self.current > self.end:
            return self.current
        else:
            sys.stdout.write(
                f"\r{self.msg}: {self.current_number()}/{str(self.end)}")
        self.current += 1
        sys.stdout.flush()
        return self.current

    def __enter__(self):
        """Output: the bound step method, to be called on each iteration."""
        return self.step

    def __exit__(self, type, value, traceback):
        """Prints a trailing newline once the progress loop is done."""
        print("")
