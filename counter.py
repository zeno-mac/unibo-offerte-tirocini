import sys

def startCounter(msg : str, start : int, end: int):
    current = start
    l = len(str(end))
    def current_number() -> str:
        nonlocal current
        return "0"*(l - len(str(current))) + str(current)
    
    def step():
        nonlocal current
        nonlocal current_number
        if current > end:
            return current
        if current == start:
            sys.stdout.write(f"{msg}: {current_number()}/{str(end)}")
        else:
            sys.stdout.write("\b"*(l*2 +1))
            sys.stdout.write(f"{current_number()}/{str(end)}")
        current+=1
        if current > end:
            sys.stdout.write("\n")
        sys.stdout.flush()
        return current
    
    return step
