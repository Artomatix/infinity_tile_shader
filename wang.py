#!/usr/bin/env python

import sys
import random
import optparse
import PIL.Image as Image

class Tile(object):
    def __init__(self, s=None, e=None, n=None, w=None, senw=None):
        self.dirs = [s, e, n, w]

        if senw != None:
            if len(senw) > 4:
                raise Exception("bad senw")
        
            self.dirs = senw

        self.set_dirs = [d is not None for d in self.dirs]

    def get_perms(self):
        perms = set()
        allSet = True
        for i in range(0, 4):
            if not self.set_dirs[i]:
                allSet = False
                for j in range(2):
                    newVals = self.dirs[:]
                    newVals[i] = j
                    t = Tile(senw=newVals)
                    perms=perms.union(t.get_perms())
        if allSet:
            perms.add(self)

        return perms

    def get_s(self):
        return self.dirs[0]
    def get_e(self):
        return self.dirs[1]
    def get_n(self):
        return self.dirs[2]
    def get_w(self):
        return self.dirs[3]

    def get_id(self):
        if self.get_s() == 0:
            if self.get_e() == 0:
                if self.get_n() == 0:
                    if self.get_w() == 0:
                        return 0
                    else: 
                        return 1
                else: 
                    if self.get_w() == 0:
                        return 2
                    else: 
                        return 3
            else: 
                if self.get_n() == 0:
                    if self.get_w() == 0:
                        return 4
                    else: 
                        return 5
                else: 
                    if self.get_w() == 0:
                        return 6
                    else: 
                        return 7
        else: 
            if self.get_e() == 0:
                if self.get_n() == 0:
                    if self.get_w() == 0:
                        return 8
                    else: 
                        return 9
                else: 
                    if self.get_w() == 0:
                        return 10
                    else: 
                        return 11
            else: 
                if self.get_n() == 0:
                    if self.get_w() == 0:
                        return 12
                    else: 
                        return 13
                else: 
                    if self.get_w() == 0:
                        return 14
                    else: 
                        return 15

    def __eq__(self, other):
        return self.get_id() == other.get_id()
    
    def __ne__(self, other):
        return not self.__eq__(other)

    def __hash__(self):
        return hash(self.__str__())

    def __repr__(self):
        return "Tile(senw=%s)" % str(self.dirs)

    __str__ = __repr__


def get_possibilities(t, grid, x, y, size_out_to_check_for_duplicates):
    perms = {k: 0 for k in t.get_perms()}
    weights = [1] * len(perms)

    size = len(grid)

    def helper_add(coords):
        t = grid[coords[1]][coords[0]]
        if t in perms:
            perms[t] += 1

    
    for dist in range(size_out_to_check_for_duplicates):
        dist += 1

        curr = [x-dist-1,y+1]

        if curr[0] < 0:
            break

        doContinue = False

        for i in range(dist+1):
            curr[0] += 1
            curr[1] -= 1

            if curr[0] >= size or curr[1] >= size or curr[1] < 0:
                doContinue = True
                break

            helper_add(curr)

        curr[0] += 1

        if doContinue or curr[0] >= size:
            continue
        
        helper_add(curr)

        for i in range(dist-1):
            curr[0] += 1
            curr[1] += 1
            
            if curr[0] >= size or curr[1] >= size or curr[1] < 0:
                break
            
            helper_add(curr)

    return perms

def get_best_from_perms(perms):
    best = []
    bestVal = 999999999999999999999999
    for t in perms.keys():
        if perms[t] < bestVal:
            bestVal = perms[t]
            best = [t]
        elif perms[t] == bestVal:
            best.append(t)
    
    return random.choice(best)

def grid_to_ascii_art(grid):
    size = len(grid)

    out = ""
    out += "-"
    for x in range(size):
        out += "----"
    out += "\n"
     
    for y in range(size):
        for x in range(size):
            out += "| " + str(grid[y][x].get_n()) + " "
        out += "|\n"

        for x in range(size):
            out += "|" + str(grid[y][x].get_w()) + " " + str(grid[y][x].get_e())
        out += "|\n"

        for x in range(size):
            out += "| " + str(grid[y][x].get_s()) + " "
        out += "|\n"
        
        out += "-"
        for x in range(size):
            out += "----"
        out += "\n"
        
    return out

def check_grid(grid):
    size = len(grid)

    for y in range(1, size):
        for x in range(1, size):
            if grid[y][x].get_n() != grid[y-1][x].get_s() or grid[y][x].get_w() != grid[y][x-1].get_e():
                raise Exception("Invalid grid!")

def generate_grid(size, size_out_to_check_for_duplicates):
    grid = [[None for i in range(size)] for j in range(size)]

    for y in range(size):
        if y % 10 == 0:
            print >> sys.stderr, "generating row %d" % y
        for x in range(size):
            s = None
            e = None

            if x == 0:
                w = None
            else:
                w = grid[y][x-1].get_e()
            

            if y == 0:
                n = None
            else:
                n = grid[y-1][x].get_s()

            perms = get_possibilities(Tile(s, e, n, w), grid, x, y, size_out_to_check_for_duplicates)
            grid[y][x] = get_best_from_perms(perms)

    return grid

def grid_to_shader_image(grid):
    size = len(grid)

    data = []
    
    for y in range(size):
        for x in range(size):
            val = grid[y][x].get_id()
            data.append((val, val, val))

    img = Image.new('RGB', (size, size))
    img.putdata(data)

    return img

def __main__():
    parser = optparse.OptionParser()
    parser.add_option("-s", "--size", dest="size", default=100)
    parser.add_option("-c", "--check_size", dest="check_size", default=3, help="distance out from each tile to check for duplicates")
    parser.add_option("-p", "--print", dest="do_print", default='true')
    parser.add_option("-o", "--output_filename", dest="output_filename", default="output")
    (options, args) = parser.parse_args()

    size = int(options.size)
    size_out_to_check_for_duplicates = int(options.check_size)
    do_print = options.do_print in ['y', 'yes', 'true']

    grid = generate_grid(size, size_out_to_check_for_duplicates)
    check_grid(grid)

    with open(options.output_filename + ".txt", "w") as f:
        f.write("int grid_size = %d;" % size)

    grid_to_shader_image(grid).save(options.output_filename + ".png")

    if do_print:
        print grid_to_ascii_art(grid)
            
if __name__ ==  "__main__":
    __main__()
