// npm install --save-dev @types/jquery
// npm install tabulator-tables --save
// npm i --save-dev @types/tabulator-tables

export interface EnshroudedFood {
	version: number;
	items: Item[];
}

export interface Item {
	name: string;
	count?: number;
	effect?: string;
	duration?: string;
	type?: string;
	requirements?: string[];
	ingredients: Ingredient[]
}

export interface Ingredient {
	name: string;
	count?: number;
}

// noinspection TypeScriptUnresolvedFunction
export class App {
	version = '1.0';

	localStorageJsonName = "enshrouded-food";

	localStorageVersionName = "enshrouded-food-version";

	jsonUrl = 'assets/enshrouded-food.json?v=' + this.version;

	init(): void {
		($('.selectpicker') as any).selectpicker();

		try {
			const localStorageJsonNameValue = window.localStorage.getItem(this.localStorageJsonName);
			const localStorageVersionNameValue = window.localStorage.getItem(this.localStorageVersionName);
			console.log('localStorageVersionNameValue ' + localStorageVersionNameValue);
			console.log('version ' + this.version);
			console.log(localStorageVersionNameValue == this.version);
			/*if (localStorageJsonNameValue && localStorageVersionNameValue == this.version) {
				const __data: EnshroudedFood = JSON.parse(localStorageJsonNameValue);
				const test = __data.version;
				this.app(__data);
			} else {*/
			this.fetchDataAgain();
			//}
		} catch (e) {
			console.error(e);
			this.fetchDataAgain();
		}
	}

	fetchDataAgain(): void {
		console.log('fetchDataAgain ' + this.jsonUrl);
		fetch(this.jsonUrl)
			.then((response: Response) => response.json() as Promise<EnshroudedFood>)
			.then((enshroudedFood: EnshroudedFood) => this.app(enshroudedFood));
	}

	app(enshroudedFood: EnshroudedFood): void {
		console.log(enshroudedFood);
		window.localStorage.setItem(this.localStorageJsonName, JSON.stringify(enshroudedFood));
		window.localStorage.setItem(this.localStorageVersionName, this.version);

		const itemsMap = new Map<string, Item>();
		enshroudedFood.items.forEach(item => itemsMap.set(item.name, item));

		for (const item of enshroudedFood.items) {
			if (item.effect && item.ingredients) {
				const reqs: string[] = [];
				item.requirements?.forEach(r => reqs.push(r));
				const ingredientsCollected = this.collapseIngredients(this.collateIngredients(reqs, itemsMap, 1 / (item.count ?? 1), item.ingredients));
				ingredientsCollected.forEach(it => {
					it.count = Number(it.count!.toFixed(1));
					if (it.count == 0) it.count = 0.1;
				})
				const consolidated: Item = {
					name: item.name,
					requirements: reqs,
					effect: item.effect,
					type: item.type,
					duration: item.duration,
					ingredients: ingredientsCollected
				};
				console.log(JSON.stringify(consolidated, null, 2));
				console.log("");
				console.log("");
				console.log("");
			}
		}
	}

	collapseIngredients(ingredients: Ingredient[]): Ingredient[] {
		const collapsed: Ingredient[] = [];
		ingredients.forEach(ingredient => {
			const found = collapsed.filter(c => c.name == ingredient.name);
			if (found && found.length > 0) {
				if (ingredient.count) {
					if (found[0].count) found[0].count += ingredient.count;
					else found[0].count = ingredient.count;
				}
			} else {
				collapsed.push(ingredient);
			}

		});
		return collapsed;
	}

	collateIngredients(reqs: string[], itemsMap: Map<string, Item>, weight: number, ingredients: Ingredient[]): Ingredient[] {
		const ingredientsCollected: Ingredient[] = [];
		for (const ingredient of ingredients) {
			let localWeight = weight * (ingredient.count ?? 1);
			if (itemsMap.has(ingredient.name)) {
				const deep = itemsMap.get(ingredient.name) as Item;
				deep.requirements?.forEach(r => reqs.push(r));
				localWeight /= (deep.count ?? 1);
				const deepIngredients: Ingredient[] = this.collateIngredients(reqs, itemsMap, localWeight, deep.ingredients);
				ingredientsCollected.push(...deepIngredients);
			} else {
				ingredientsCollected.push({name: ingredient.name, count: localWeight});
			}
		}
		return ingredientsCollected;
	}
}
