#ifdef GLSL
    #define float4 vec4
    #define float2 vec2
    #define frac fract
    #define tex2D texture2D
#endif

// just a sample that guarantees using the highest mip level
#ifndef GRID_SAMPLE
    #ifdef GLSL
        #define GRID_SAMPLE(uv) texture2D(wangSampler, uv, -999.0)
    #else
        #define GRID_SAMPLE(uv) tex2Dlod(wangSampler, float4((uv.x), (uv.y), 0, 0))
    #endif
#endif

// You may be wondering why there's a bunch of horrible macros instead of functions.
// That's to support embedding in a custom material node in unreal, where you can only
// input one big long function body, so you can't declare functions.


// You may also wonder why we used a bunch of ifs here instead of one if and a bunch of
// else-ifs. When we used a bunch of else-ifs the unity shader compiler crashed with a stack overflow.
#define GET_TILE_FROM_PREDEFINED(tile, tileX, tileY)                    \
{                                                                       \
    float2 hashUv = float2(tileX, tileY);                               \
    hashUv += float2(0.5, 0.5);                                         \
    hashUv /= float2(grid_size, grid_size);                             \
    int grid_entry = int(GRID_SAMPLE(hashUv).r * 255.0);                \
                                                                        \
    if(grid_entry == 0)                                                 \
        tile = float2(0.0, 3.0);                                        \
    if(grid_entry == 1)                                                 \
        tile = float2(3.0, 3.0);                                        \
    if(grid_entry == 2)                                                 \
        tile = float2(0.0, 2.0);                                        \
    if(grid_entry == 3)                                                 \
        tile = float2(3.0, 2.0);                                        \
    if(grid_entry == 4)                                                 \
        tile = float2(1.0, 3.0);                                        \
    if(grid_entry == 5)                                                 \
        tile = float2(2.0, 3.0);                                        \
    if(grid_entry == 6)                                                 \
        tile = float2(1.0, 2.0);                                        \
    if(grid_entry == 7)                                                 \
        tile = float2(2.0, 2.0);                                        \
    if(grid_entry == 8)                                                 \
        tile = float2(0.0, 0.0);                                        \
    if(grid_entry == 9)                                                 \
        tile = float2(3.0, 0.0);                                        \
    if(grid_entry == 10)                                                \
        tile = float2(0.0, 1.0);                                        \
    if(grid_entry == 11)                                                \
        tile = float2(3.0, 1.0);                                        \
    if(grid_entry == 12)                                                \
        tile = float2(1.0, 0.0);                                        \
    if(grid_entry == 13)                                                \
        tile = float2(2.0, 0.0);                                        \
    if(grid_entry == 14)                                                \
        tile = float2(1.0, 1.0);                                        \
    if(grid_entry == 15)                                                \
        tile = float2(2.0, 1.0);                                        \
}

#define GET_SENW(senw, tile)                                            \
{                                                                       \
	if     (tile.x == 0.0 && tile.y == 3.0) senw = float4(0, 0, 0, 0);  \
	else if(tile.x == 3.0 && tile.y == 3.0) senw = float4(0, 0, 0, 1);  \
	else if(tile.x == 0.0 && tile.y == 2.0) senw = float4(0, 0, 1, 0);  \
	else if(tile.x == 3.0 && tile.y == 2.0) senw = float4(0, 0, 1, 1);  \
	else if(tile.x == 1.0 && tile.y == 3.0) senw = float4(0, 1, 0, 0);  \
	else if(tile.x == 2.0 && tile.y == 3.0) senw = float4(0, 1, 0, 1);  \
	else if(tile.x == 1.0 && tile.y == 2.0) senw = float4(0, 1, 1, 0);  \
	else if(tile.x == 2.0 && tile.y == 2.0) senw = float4(0, 1, 1, 1);  \
	else if(tile.x == 0.0 && tile.y == 0.0) senw = float4(1, 0, 0, 0);  \
	else if(tile.x == 3.0 && tile.y == 0.0) senw = float4(1, 0, 0, 1);  \
	else if(tile.x == 0.0 && tile.y == 1.0) senw = float4(1, 0, 1, 0);  \
	else if(tile.x == 3.0 && tile.y == 1.0) senw = float4(1, 0, 1, 1);  \
	else if(tile.x == 1.0 && tile.y == 0.0) senw = float4(1, 1, 0, 0);  \
	else if(tile.x == 2.0 && tile.y == 0.0) senw = float4(1, 1, 0, 1);  \
	else if(tile.x == 1.0 && tile.y == 1.0) senw = float4(1, 1, 1, 0);  \
	else if(tile.x == 2.0 && tile.y == 1.0) senw = float4(1, 1, 1, 1);  \
    else senw = float4(0,0,0,0);                                        \
}

#define HASH(in1, in2) (int(frac(sin(dot(float2(in1+2*in2, in1+in2),float2(12.9898,78.233))) * 43758.5453) > 0.5))

// This function will sample a packed wang tile set with two edge colours. This is pretty much the only kind of wang
// tile you can even use. The presumption is that the input texture coordinates will exceed 1, as in a normal terrain
// in a game engine, where each tile of the terrain will increase the texcoords by 1.
// Because there are only two edge colours, the hash function just returns 0 or 1.
// The basic algorithm is as follows:
// - calculate which tile we are currently in
// - generate a hash for each of the four edges of the current tile. Because the wang tile set we are using is complete,
// we are always able to render any combination of edge hashes.
// - by carefully choosing the values we hash, we can make sure that the edge colours always match. Eg: we might hash the west side
// with hash(x), and the east side with hash(x-1). In this way, the west edge of tile (n, m) will always be the same as the east edge 
// of tile (n+1, m)
// - we actually use both the x and y in our hashes with some multiplication and addition as it gives better results but we make sure 
// not to violate the basic principle
// - The final step is to turn the 4 edge hashes into uv a tile index (x and y, from 0-4), and then turn that into a texture coordinate
// - finally we do the texture sample. We do that here because we need to do a slightly specialised texture sample. Because our texture
// coords can vary a lot from one pixel to the next at a tile border, we can end up using bad mip levels just at the edges. This is
// obviously undesireable, so we use the built in mechanism of ddx and ddy to fix this (google ddx ddy hlsl if you don't know what
// this is)
//
// Finally, this function also supports a predefined chunk passed in as a texture. The texture is generated by wang.py, and just
// contains values from 0-15 in each pixel corresponding to the 16 possible tiles in the tileset. Where the dimensions of 
// this predefined chunk are n*n, the first n*n tiles around the origin will use the predefined chunk from that texture.
// This can be disabled by defining NO_PREDEFINED.
// The reason that we want this is that while the hashing method described above will produce decent results, there's no way to
// ensure that it doesn't place the same tile beside itself. The predefined section is generated sequentially, and tries to
// space tiles out so they aren't placed close to themselves.
#ifndef NO_FUNCTION
float4 wangSample(sampler2D texSampler, float2 uv)
{
#endif
    
#ifndef NO_PREDEFINED
        #include "wang_layout_array.txt"
#endif

    #ifdef FLIP_V
        uv.y = 1.0-uv.y;
    #endif
    
	float2 t = floor(uv);
    
	int tileX = int(t.x);
	int tileY = int(t.y);

    float2 tile = float2(0.0, 0.0);

#ifndef NO_PREDEFINED
    int predef_tileX = tileX;
    int predef_tileY = tileY;

    #ifdef FLIP_V
        predef_tileY = grid_size - tileY - 1;
    #endif
    
    // grab from predefined
    if(tileX >= 0 && tileX < grid_size && tileY >= 0 && tileY < grid_size)
    {
        GET_TILE_FROM_PREDEFINED(tile, tileX, predef_tileY)
    }
    // use the hashing algorithm
    else
#endif // NO_PREDFINED
    {
        // senw - South, East, North, West
        int s = 0;
        int e = 0;
        int n = 0;
        int w = 0;
        
        // calculate s
// here we handle the case where we're at the edge of the predefined area
#ifndef NO_PREDEFINED
        if(tileY == grid_size && tileX >= 0 && tileX < grid_size)
        {
            float2 tile_tmp = float2(0, 0);
            #ifdef FLIP_V
                GET_TILE_FROM_PREDEFINED(tile_tmp, tileX, predef_tileY+1);
            #else
                GET_TILE_FROM_PREDEFINED(tile_tmp, tileX, predef_tileY-1);
            #endif
            float4 senw;
            GET_SENW(senw, tile_tmp);

            s = int(senw.z);
        }
        else
#endif // NO_PREDFINE
// here we do the normal hash when we're not in the predefined area
        {
            s = HASH(tileY-1, tileX);
        }
        
        // calculate e
#ifndef NO_PREDEFINED
        if(tileX == -1 && tileY >= 0 && tileY < grid_size)
        {
            float2 tile_tmp = float2(0, 0);
            GET_TILE_FROM_PREDEFINED(tile_tmp, tileX+1, predef_tileY);
            float4 senw;
            GET_SENW(senw, tile_tmp);

            e = int(senw.w);
        }
        else
#endif // NO_PREDFINED
        {
            e = HASH(tileX+1, tileY);
        }
        
        // calculate n
#ifndef NO_PREDEFINED
        if(tileY == -1 &&  tileX >= 0 && tileX < grid_size)
        {
            float2 tile_tmp = float2(0, 0);
            #ifdef FLIP_V
                GET_TILE_FROM_PREDEFINED(tile_tmp, tileX, predef_tileY-1);
            #else
                GET_TILE_FROM_PREDEFINED(tile_tmp, tileX, predef_tileY+1);
            #endif
            float4 senw;
            GET_SENW(senw, tile_tmp);

            n = int(senw.x);
        }
        else
#endif // NO_PREDFINED
        {
            n = HASH(tileY, tileX);
        }
        
        // caclulate w
#ifndef NO_PREDEFINED
        if(tileX == grid_size && tileY >= 0 && tileY < grid_size)
        {
            float2 tile_tmp = float2(0, 0);
            GET_TILE_FROM_PREDEFINED(tile_tmp, tileX-1, predef_tileY);
            float4 senw;
            GET_SENW(senw, tile_tmp);

            w = int(senw.y);
        }
        else
#endif // NO_PREDFINED
        {
            w = HASH(tileX, tileY);
        }
        
        // turn senw values into a tile specifier (x,y coord) of the tile to use (from the tileset)        
        if(s == 0)
        {
            if(e == 0)
            {
                if(n == 0)
                {
                    if(w == 0)
                        tile = float2(0.0, 3.0); // 0, 0, 0, 0
                    else // w == 1.0
                        tile = float2(3.0, 3.0); // 0, 0, 0, 1
                }
                else // n == 1.0
                {
                    if(w == 0)
                        tile = float2(0.0, 2.0); // 0, 0, 1, 0
                    else // w == 1.0
                        tile = float2(3.0, 2.0); // 0, 0, 1, 1
                }   
            }
            else // e == 1.0
            {
                if(n == 0)
                {
                    if(w == 0)
                        tile = float2(1.0, 3.0); // 0, 1, 0, 0
                    else // w == 1.0
                        tile = float2(2.0, 3.0); // 0, 1, 0, 1
                }
                else // n == 1.0
                {
                    if(w == 0)
                        tile = float2(1.0, 2.0); // 0, 1, 1, 0
                    else // w == 1.0
                        tile = float2(2.0, 2.0); // 0, 1, 1, 1
                }   
            }   
        }   
        else // s == 1.0
        {
            if(e == 0)
            {
                if(n == 0)
                {
                    if(w == 0)
                        tile = float2(0.0, 0.0); // 1, 0, 0, 0
                    else // w == 1.0
                        tile = float2(3.0, 0.0); // 1, 0, 0, 1
                }
                else // n == 1.0
                {
                    if(w == 0)
                        tile = float2(0.0, 1.0); // 1, 0, 1, 0
                    else // w == 1.0
                        tile = float2(3.0, 1.0); // 1, 0, 1, 1
                }
            }
            else // e == 1.0
            {
                if(n == 0)
                {
                    if(w == 0)
                        tile = float2(1.0, 0.0); // 1, 1, 0, 0
                    else // w == 1.0
                        tile = float2(2.0, 0.0); // 1, 1, 0, 1
                }
                else // n == 1.0
                {
                    if(w == 0)
                        tile = float2(1.0, 1.0); // 1, 1, 1, 0
                    else // w == 1.0
                        tile = float2(2.0, 1.0); // 1, 1, 1, 1
                }
            }
        }
    }

    // calculate the final texture coordinates from the computed tile value
	float2 finalCoords;
	finalCoords.x = (tile.x/4.0) + frac(uv.x)/4.0;
	finalCoords.y = ((3.0-tile.y)/4.0) + frac(uv.y)/4.0;

    #ifdef FLIP_V
	    finalCoords.y = 1.0-finalCoords.y;
    #endif
    
    
    // do the final texture sample
    #ifdef FINAL_SAMPLE_OVERRIDE
        return FINAL_SAMPLE_OVERRIDE(finalCoords);
    #else
        #ifdef GLSL
            ESCAPED_HASH(ifdef) GL_ES
                return texture2D(texSampler, finalCoords, -999.0);// GL_ES doesn't support textureGrad, so just force it to use the highest mip level
            ESCAPED_HASH(else)
                return textureGrad(texSampler, finalCoords, dFdx(uv/4.0), dFdy(uv/4.0));
            ESCAPED_HASH(endif)
        #else
            return tex2D(texSampler, finalCoords, ddx(uv/4), ddy(uv/4));
        #endif
    #endif

#ifndef NO_FUNCTION
}
#endif
