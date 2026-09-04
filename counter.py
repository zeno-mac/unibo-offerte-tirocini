import sys

class Counter(object):
    msg = ""
    current = 0
    length = 0
    end = 0

    def __init__(self, msg: str, start: int, end: int):
        self.msg = msg
        self.current = start
        self.end = end
        self.length = len(str(end))
        return

    def current_number(self) -> str:
        self.current
        return "0"*(self.length - len(str(self.current))) + str(self.current)

    def step(self):
        if self.current > self.end:
            return self.current
        else:
            sys.stdout.write(
                f"\r{self.msg}: {self.current_number()}/{str(self.end)}")
        self.current += 1
        sys.stdout.flush()
        return self.current

    def __enter__(self):
        return self.step

    def __exit__(self, type, value, traceback):
        print("")
        