Shader "Marrakech/Water" {
    Properties {
        _StudyTime ("Motion clock", Float) = 0
        _WaterScale ("Wave scale", Float) = 1
        _Opacity ("Minimum opacity", Float) = .64
        _UsePlanar ("Planar reflection", Float) = 0
        _PlanarReflection ("Reflection", 2D) = "black" {}
    }
    SubShader {
        Tags { "RenderType"="Transparent" "Queue"="Transparent" "RenderPipeline"="UniversalPipeline" }
        Pass {
            Tags { "LightMode"="UniversalForward" }
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            HLSLPROGRAM
            #pragma vertex Vert
            #pragma fragment Frag
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
            #include "Generated/WaterFlow.hlsl"
            CBUFFER_START(UnityPerMaterial)
            float _StudyTime;
            float _WaterScale;
            float _Opacity;
            float _UsePlanar;
            CBUFFER_END
            TEXTURE2D(_PlanarReflection);
            SAMPLER(sampler_PlanarReflection);
            float4x4 _ReflectionMatrix;
            struct Attributes { float4 positionOS : POSITION; };
            struct Varyings { float4 positionCS : SV_POSITION; float3 positionWS : TEXCOORD0; float fog : TEXCOORD1; };
            Varyings Vert(Attributes v) {
                Varyings o;
                o.positionWS = TransformObjectToWorld(v.positionOS.xyz);
                o.positionCS = TransformWorldToHClip(o.positionWS);
                o.fog = ComputeFogFactor(o.positionCS.z);
                return o;
            }
            half4 Frag(Varyings i) : SV_Target {
                float2 p = i.positionWS.xz / _WaterScale;
                p.x = -p.x;
                float3 flow = waterSurface(p, _StudyTime * rsqrt(_WaterScale), waterFootprint(p));
                float3 n = normalize(float3(flow.y, 1, -flow.z));
                float3 v = normalize(GetWorldSpaceViewDir(i.positionWS));
                float fresnel = .02 + .98 * pow(1-saturate(dot(n,v)),5);
                half3 reflection = GlossyEnvironmentReflection(reflect(-v,n), .12, 1);
                if (_UsePlanar > .5) {
                    float4 projected = mul(_ReflectionMatrix, float4(i.positionWS, 1));
                    float2 uv = projected.xy / projected.w * .5 + .5 + n.xz * .012;
                    reflection = SAMPLE_TEXTURE2D(_PlanarReflection, sampler_PlanarReflection, clamp(uv, .002, .998)).rgb;
                }
                Light sun = GetMainLight();
                float highlight = pow(saturate(dot(reflect(-sun.direction,n),v)),320) * 2;
                half3 color = lerp(half3(.09,.19,.16),reflection,fresnel) + sun.color*highlight;
                return half4(MixFog(color, i.fog), saturate(_Opacity + fresnel*.35));
            }
            ENDHLSL
        }
    }
}
