all: unity unreal custom

compile = cpp -C -nostdinc $(1) -o - | sed '/^\#/d' | sed 's/SED_NL/\n/g' > $(2)

shader_base.frag: wang_layout_array.txt helper.h

wang_layout_array.png: wang_layout_array.txt

wang_layout_array.txt: wang.py
	./wang.py --size 1024 --check_size 3 --print false -o wang_layout_array

clean:
	-rm wang_layout_array.* 
	-rm unity_wang.cginc
	-rm unreal_snippet.txt
	-rm custom_snippet.txt

#########
# unity #
#########
unity: unity_wang.cginc wang_layout_array.png

unity_wang.cginc: unity_base.cginc shader_base.frag
	$(call compile, unity_base.cginc, unity_wang.cginc)

##########
# unreal #
##########
unreal: unreal_snippet.txt wang_layout_array.png

unreal_snippet.txt: unreal_base.txt shader_base.frag
	$(call compile, unreal_base.txt, unreal_snippet.txt)

##########
# custom #
##########
custom: custom_snippet.txt wang_layout_array.png

custom_snippet.txt: custom_base.txt shader_base.frag
	$(call compile, custom_base.txt, custom_snippet.txt)
