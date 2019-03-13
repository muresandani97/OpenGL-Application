#version 410 core

in vec3 normal;
in vec4 fragPosEye;
in vec4 fragPosLightSpace;
in vec2 fragTexCoords;
in vec4 fragPos;

out vec4 fColor;

//lighting
uniform	mat3 normalMatrix;
uniform mat3 lightDirMatrix;
uniform	vec3 lightColor;
uniform	vec3 lightDir;
uniform sampler2D diffuseTexture;
uniform sampler2D specularTexture;
uniform sampler2D shadowMap;

uniform vec3 pointLightPos;
uniform int lampOn;

vec3 ambient;
float ambientStrength = 0.2f;
vec3 diffuse;
vec3 specular;
float specularStrength = 0.5f;
float shininess = 64.0f;

float constant = 1.0f;
float linear = 0.22f;
float quadratic = 0.20f;
float pointSpecularStrenght = 0.1f;

vec3 o;

void computeLightComponents()
{		
	vec3 cameraPosEye = vec3(0.0f);//in eye coordinates, the viewer is situated at the origin
	
	//transform normal
	vec3 normalEye = normalize(normalMatrix * normal);	
	
	//compute light direction
	vec3 lightDirN = normalize(lightDirMatrix * lightDir);	

	//compute view direction 
	vec3 viewDirN = normalize(cameraPosEye - fragPosEye.xyz);
	
	//compute half vector
	vec3 halfVector = normalize(lightDirN + viewDirN);
		
	//compute ambient light
	ambient = ambientStrength * lightColor;
	
	//compute diffuse light
	diffuse = max(dot(normalEye, lightDirN), 0.0f) * lightColor;
	
	//compute specular light
	float specCoeff = pow(max(dot(halfVector, normalEye), 0.0f), shininess);
	specular = specularStrength * specCoeff * lightColor;
}

float computeShadow()
{	
	// perform perspective divide
    vec3 normalizedCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    if(normalizedCoords.z > 1.0f)
        return 0.0f;
    // Transform to [0,1] range
    normalizedCoords = normalizedCoords * 0.5f + 0.5f;
    // Get closest depth value from light's perspective (using [0,1] range fragPosLight as coords)
    float closestDepth = texture(shadowMap, normalizedCoords.xy).r;    
    // Get depth of current fragment from light's perspective
    float currentDepth = normalizedCoords.z;
    // Check whether current frag pos is in shadow
    float bias = 0.005f;
    float shadow = currentDepth - bias> closestDepth  ? 1.0f : 0.0f;

    return shadow;	
}

vec4 fogColor = vec4(0.5f, 0.5f, 0.5f, 1.0f);

float computeFog()
{
 float fogDensity = 0.01f;
 float fragmentDistance = length(fragPosEye);
 float fogFactor = exp(-pow(fragmentDistance * fogDensity, 2));

 return clamp(fogFactor, 0.0f, 1.0f);
}

void computePointLightComponents()
{
	vec3 norm = normalize(normalMatrix * normal);
	vec3 lightDir = normalize(pointLightPos - fragPos.xyz);
	
	// diffuse shading
    float diff = max(dot(norm, lightDir), 0.0);

    // specular shading
	vec3 viewDir = normalize(vec3(0.0f) - fragPos.xyz);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32);
	
	// attenuation
    float distance    = length(pointLightPos - fragPos.xyz);
    float attenuation = 1.0 / (constant + linear * distance + 
  			     quadratic * (distance * distance));

    // combine results
    ambient  += lightColor * vec3(texture(diffuseTexture, fragTexCoords)) * attenuation;
    diffuse  += lightColor * diff * vec3(texture(diffuseTexture, fragTexCoords)) * attenuation;
    specular += lightColor * spec * pointSpecularStrenght * attenuation;				 
}


void main() 
{
	computeLightComponents();
	
	if(lampOn==1){
	computePointLightComponents();
	}
	
	float shadow = computeShadow();
	
	//modulate with diffuse map
	ambient *= vec3(texture(diffuseTexture, fragTexCoords));
	diffuse *= vec3(texture(diffuseTexture, fragTexCoords));
	//modulate woth specular map
	specular *= vec3(texture(specularTexture, fragTexCoords));
	
	//modulate with shadow
	vec3 color = min((ambient + (1.0f - shadow)*diffuse) + (1.0f - shadow)*specular, 1.0f);
    
    float fogFactor = computeFog();
   
	
    fColor = mix(fogColor,vec4 (color,1.0f), fogFactor);
}
