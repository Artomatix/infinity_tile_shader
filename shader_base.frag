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
// Finally, this function also supports a predefined chunk passed in as a texture, when you define the macro PREDEFINED.
// The texture is generated by wang.py, and just contains the xy grid coords in the 4x4 tile set in the red and green channels.
// The reason that we want this is that while the hashing method described above will produce decent results, there's no way to
// ensure that it doesn't place the same tile beside itself. The predefined section is generated sequentially, and tries to
// space tiles out so they aren't placed close to themselves, but will repeat over long distances.
#ifndef NO_FUNCTION
float4 wangSample(sampler2D texSampler, float2 uv)
{
#endif
    #ifdef FLIP_V
        uv.y = 1.0-uv.y;
    #endif
    
	float2 t = floor(uv);
    
	int tileX = int(t.x);
	int tileY = int(t.y);

    float2 tile = float2(0.0, 0.0);
    
    #ifdef PREDEFINED 
    {
        #include "wang_layout_array.txt" // defines grid_size

        int predef_tileX = tileX;
        int predef_tileY = tileY;

        #ifdef FLIP_V
            predef_tileY = grid_size - tileY - 1;
        #endif

        // grab from predefined
        float2 hashUv = float2(tileX, predef_tileY);
        hashUv += float2(0.5, 0.5);
        hashUv /= float2(grid_size, grid_size);
        int grid_entry = int(GRID_SAMPLE(hashUv).r * 255.0);

        tile = GRID_SAMPLE(hashUv).rg * 255.0;
    }
    #else // PREDEFINED
    {
        // use the hashing algorithm

        // senw - South, East, North, West
        int s = HASH(tileY-1, tileX);
        int e = HASH(tileX+1, tileY);
        int n = HASH(tileY, tileX);
        int w = HASH(tileX, tileY);

        // turn senw values into a tile specifier (x,y coord) of the tile to use (from the tileset)        
        // in webgl we can't do lookup tables, so we use a big 'ol nasty if-else chain

        #ifndef NO_LOOKUP_TABLES
        {
            static const float2 tiles[16] = 
            {
                float2(0.0, 3.0), // 0, 0, 0, 0     // 0
                float2(3.0, 3.0), // 0, 0, 0, 1     // 1
                float2(0.0, 2.0), // 0, 0, 1, 0     // 2
                float2(3.0, 2.0), // 0, 0, 1, 1     // 3
                float2(1.0, 3.0), // 0, 1, 0, 0     // 4
                float2(2.0, 3.0), // 0, 1, 0, 1     // 5
                float2(1.0, 2.0), // 0, 1, 1, 0     // 6
                float2(2.0, 2.0), // 0, 1, 1, 1     // 7
                float2(0.0, 0.0), // 1, 0, 0, 0     // 8
                float2(3.0, 0.0), // 1, 0, 0, 1     // 9 
                float2(0.0, 1.0), // 1, 0, 1, 0     // 10
                float2(3.0, 1.0), // 1, 0, 1, 1     // 11
                float2(1.0, 0.0), // 1, 1, 0, 0     // 12
                float2(2.0, 0.0), // 1, 1, 0, 1     // 13
                float2(1.0, 1.0), // 1, 1, 1, 0     // 14
                float2(2.0, 1.0), // 1, 1, 1, 1     // 15
            };

            tile = tiles[w + 2*n + 4*e + 8*s];

        }    
        #else // ndef NO_LOOKUP_TABLES
        {
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
        #endif // ndef NO_LOOKUP_TABLES
    }
    #endif // PREDEFINED

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
